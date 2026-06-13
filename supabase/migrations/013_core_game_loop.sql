-- Core game loop: completion → server-side reward grant → ledger → profile.
--
-- Design:
-- * quest_completions.due_date identifies the occurrence (the kid-device
--   local calendar date the quest was due). A partial unique index makes
--   completion idempotent — rapid double-taps collapse into one row; a
--   rejected row frees the slot so the kid can try again.
-- * Rewards are NEVER client-computed. Approval (or auto-approval when
--   requires_approval = false) fires a trigger that computes streak,
--   multiplier, gold/XP and inserts gold_xp_ledger rows; the existing
--   gold_xp_ledger_apply trigger (006) folds them into the profile.
--   A unique (source_type, source_id) index makes the grant itself
--   idempotent even if a status update is replayed.
-- * Streaks are computed from completion history (compute_streak), never
--   incremented — no stored-counter drift. A day counts when every required
--   quest due that day has a non-rejected completion; days with no required
--   quests are rest days (they neither extend nor break the chain).
-- * Game math MUST match lib/game-math.ts. The XP step/threshold arrays
--   below are generated from the TS functions (base 100, growth 1.15,
--   rounded per level, cap 50) so the two cannot drift by float behavior.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.quest_completions
  add column due_date date not null default (now() at time zone 'utc')::date,
  add column rejection_reason text;

-- One live completion per occurrence; 'rejected' frees the slot for a retry.
create unique index quest_completions_occurrence_uniq
  on public.quest_completions (quest_id, adventurer_id, due_date)
  where status <> 'rejected';

-- Grant idempotency: one ledger row per (source_type, source_id) pair.
-- NULL source_ids (manual adjustments) stay unrestricted.
create unique index gold_xp_ledger_source_uniq
  on public.gold_xp_ledger (source_type, source_id);

create index quest_completions_pending_idx
  on public.quest_completions (status)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Game math mirrors (single source of truth: lib/game-math.ts)
-- ---------------------------------------------------------------------------

-- XP to advance FROM level L to L+1, levels 1..49. 0 at/above the cap.
create or replace function public.xp_for_level(p_level integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when p_level between 1 and 49 then (array[
      100,115,132,152,175,201,231,266,306,352,
      405,465,535,615,708,814,936,1076,1238,1423,
      1637,1882,2164,2489,2863,3292,3786,4354,5007,5758,
      6621,7614,8757,10070,11580,13318,15315,17612,20254,23292,
      26786,30804,35425,40739,46850,53877,61958,71252,81940
    ])[p_level]
    else 0
  end;
$$;

-- Replaces the placeholder sqrt curve from 006. Total-XP thresholds for
-- levels 1..50; level = highest threshold reached, capped at 50.
create or replace function public.level_for_xp(p_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  with thresholds as (
    select array[
      0,100,215,347,499,674,875,1106,1372,1678,
      2030,2435,2900,3435,4050,4758,5572,6508,7584,8822,
      10245,11882,13764,15928,18417,21280,24572,28358,32712,37719,
      43477,50098,57712,66469,76539,88119,101437,116752,134364,154618,
      177910,204696,235500,270925,311664,358514,412391,474349,545601,627541
    ] as t
  )
  select coalesce(
    (select max(i) from thresholds, generate_subscripts(t, 1) i
      where t[i] <= greatest(p_xp, 0)),
    1
  );
$$;

-- Streak tiers: 0-2 → 1.0, 3-6 → 1.1, 7-13 → 1.25, 14-29 → 1.5, 30+ → 2.0.
create or replace function public.streak_multiplier(p_days integer)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_days >= 30 then 2.0
    when p_days >= 14 then 1.5
    when p_days >= 7 then 1.25
    when p_days >= 3 then 1.1
    else 1.0
  end;
$$;

-- ---------------------------------------------------------------------------
-- Recurrence: is a quest due on a given local date?
-- Date-level mirror of lib/recurrence.ts occurrencesFor (time windows are a
-- display concern; a day's quest counts whenever completed that day).
-- ---------------------------------------------------------------------------

create or replace function public.quest_due_on(p_recurrence jsonb, p_day date)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_type text;
begin
  if p_recurrence is null or jsonb_typeof(p_recurrence) <> 'object' then
    return false;
  end if;
  if p_recurrence ? 'startDate' and p_day < (p_recurrence ->> 'startDate')::date then
    return false;
  end if;
  if p_recurrence ? 'endDate' and p_day > (p_recurrence ->> 'endDate')::date then
    return false;
  end if;

  v_type := p_recurrence ->> 'type';
  if v_type = 'daily' then
    return true;
  elsif v_type = 'once' then
    return p_day = (p_recurrence ->> 'date')::date;
  elsif v_type = 'weekly' then
    -- extract(dow) is 0 = Sunday, matching the JS convention in the jsonb.
    return (p_recurrence -> 'days') @> to_jsonb(extract(dow from p_day)::integer);
  elsif v_type = 'monthly' then
    -- Clamped to short months, mirroring min(day, daysInMonth) client-side.
    return extract(day from p_day)::integer = least(
      (p_recurrence ->> 'day')::integer,
      extract(day from (date_trunc('month', p_day) + interval '1 month - 1 day'))::integer
    );
  end if;
  return false;
exception
  when others then return false; -- malformed jsonb yields "not due", never an error
end;
$$;

-- ---------------------------------------------------------------------------
-- Streak: computed from history, never incremented.
-- A day counts when every required quest due that day has a completion in
-- ('pending', 'approved') — pending counts so approval lag doesn't punish
-- the kid; a rejection recomputes (below). Days with no required quests are
-- rest days. The as-of day itself never *breaks* the chain (it may still be
-- in progress); it just doesn't count until it's fully done.
-- Lookback is capped at 365 days.
-- ---------------------------------------------------------------------------

create or replace function public.compute_streak(p_adventurer_id uuid, p_as_of date)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_streak integer := 0;
  v_day date := p_as_of;
  v_required integer;
  v_missing integer;
  v_lookback integer := 0;
begin
  loop
    exit when v_lookback > 365;

    select count(*) into v_required
      from public.quests q
      where q.archived_at is null
        and q.is_required
        and p_adventurer_id = any (q.assigned_adventurer_ids)
        and public.quest_due_on(q.recurrence, v_day);

    if v_required > 0 then
      select count(*) into v_missing
        from public.quests q
        where q.archived_at is null
          and q.is_required
          and p_adventurer_id = any (q.assigned_adventurer_ids)
          and public.quest_due_on(q.recurrence, v_day)
          and not exists (
            select 1 from public.quest_completions c
            where c.quest_id = q.id
              and c.adventurer_id = p_adventurer_id
              and c.due_date = v_day
              and c.status in ('pending', 'approved')
          );
      if v_missing = 0 then
        v_streak := v_streak + 1;
      elsif v_day <> p_as_of then
        exit; -- a fully-missed past day breaks the chain
      end if;
    end if;

    v_day := v_day - 1;
    v_lookback := v_lookback + 1;
  end loop;
  return v_streak;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reward grant. Runs as definer; fires on approval (NPC update) or on insert
-- already approved (auto-approve path, seeds).
-- ---------------------------------------------------------------------------

create or replace function public.handle_completion_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quest public.quests%rowtype;
  v_adv public.adventurer_profiles%rowtype;
  v_streak integer;
  v_mult numeric;
  v_gold integer;
  v_xp integer;
  v_level_before integer;
  v_level_after integer;
  v_granted uuid;
begin
  -- Approved completions are immutable: no un-approve, no approve→reject.
  -- (Rewards are already in the ledger; history must stay consistent.)
  if tg_op = 'UPDATE' and old.status = 'approved' and new.status is distinct from old.status then
    raise exception 'approved completions are immutable';
  end if;

  if new.status <> 'approved' then
    -- A pending day counted toward the streak; rejection releases it.
    if tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'rejected' then
      update public.adventurer_profiles
        set current_streak_days = public.compute_streak(
              new.adventurer_id,
              greatest(new.due_date, (now() at time zone 'utc')::date))
        where id = new.adventurer_id;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'approved' then
    return new; -- no status transition; nothing to grant
  end if;

  select * into v_quest from public.quests where id = new.quest_id;
  if not found then
    return new;
  end if;

  -- Row lock serializes concurrent grants for the same adventurer, so the
  -- level-before/after comparison can't interleave.
  select * into v_adv
    from public.adventurer_profiles
    where id = new.adventurer_id
    for update;

  v_streak := public.compute_streak(new.adventurer_id, new.due_date);
  v_mult := public.streak_multiplier(v_streak);
  v_gold := round(v_quest.gold_reward * v_mult)::integer;
  v_xp := round(v_quest.xp_reward * v_mult)::integer;
  v_level_before := public.level_for_xp(v_adv.xp_total);

  insert into public.gold_xp_ledger
      (adventurer_id, delta_gold, delta_xp, delta_achievement_points, source_type, source_id)
    values (new.adventurer_id, v_gold, v_xp, 0, 'quest_completion', new.id)
    on conflict (source_type, source_id) do nothing
    returning id into v_granted;

  if v_granted is null then
    return new; -- replayed event: this completion already paid out
  end if;

  -- Level-up spoils: achievement points per level gained (cosmetic currency).
  v_level_after := public.level_for_xp(v_adv.xp_total + v_xp);
  if v_level_after > v_level_before then
    insert into public.gold_xp_ledger
        (adventurer_id, delta_gold, delta_xp, delta_achievement_points, source_type, source_id)
      values (new.adventurer_id, 0, 0, (v_level_after - v_level_before) * 25, 'level_up', new.id)
      on conflict (source_type, source_id) do nothing;
  end if;

  update public.adventurer_profiles
    set current_streak_days = v_streak,
        longest_streak_days = greatest(longest_streak_days, v_streak)
    where id = new.adventurer_id;

  return new;
end;
$$;

-- Auto-approve completions for quests that don't require approval. AFTER
-- INSERT (not BEFORE) so the device RLS policy's status = 'pending' check
-- applies to what the client sent; the definer update then flips it, which
-- fires the grant trigger.
create or replace function public.auto_approve_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending' and exists (
    select 1 from public.quests q
    where q.id = new.quest_id and q.requires_approval = false
  ) then
    update public.quest_completions
      set status = 'approved', approved_at = now()
      where id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

-- Trigger order on INSERT is alphabetical: auto_approve runs first and its
-- UPDATE fires the grant; the grant trigger's own INSERT firing then sees
-- either 'pending' (no-op) or 'approved' (seed/direct inserts).
create trigger quest_completions_auto_approve
  after insert on public.quest_completions
  for each row
  execute function public.auto_approve_completion();

create trigger quest_completions_grant
  after insert or update of status on public.quest_completions
  for each row
  execute function public.handle_completion_change();

-- ---------------------------------------------------------------------------
-- RLS hardening + new access
-- ---------------------------------------------------------------------------

-- Tighten the device insert policy: a kid device may only complete a quest
-- it is assigned to, for an occurrence actually due, and only for "today"
-- (±1 day of UTC to absorb device-local timezone offsets). This closes the
-- farming hole where a device could post completions for arbitrary dates.
drop policy quest_completions_device_insert on public.quest_completions;
create policy quest_completions_device_insert on public.quest_completions
  for insert to authenticated
  with check (
    adventurer_id = public.bound_adventurer_id()
    and status = 'pending'
    and approved_at is null
    and approved_by_npc_id is null
    and rejection_reason is null
    and due_date between ((now() at time zone 'utc')::date - 1)
                     and ((now() at time zone 'utc')::date + 1)
    and exists (
      select 1 from public.quests q
      where q.id = quest_id
        and q.guild_id = public.bound_guild_id()
        and q.archived_at is null
        and adventurer_id = any (q.assigned_adventurer_ids)
        and public.quest_due_on(q.recurrence, due_date)
    )
  );

-- TEST INTENT: a kid device sees its own reward history (count-ups, level-up
-- detection), never a sibling's.
create policy gold_xp_ledger_device_select on public.gold_xp_ledger
  for select to authenticated
  using (adventurer_id = public.bound_adventurer_id());

grant execute on function public.xp_for_level(integer) to authenticated;
grant execute on function public.streak_multiplier(integer) to authenticated;
grant execute on function public.quest_due_on(jsonb, date) to authenticated;
grant execute on function public.compute_streak(uuid, date) to authenticated;
