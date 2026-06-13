-- Identity & achievement economy: achievement catalog + exactly-once awards,
-- and the atomic cosmetic purchase/equip path.
--
-- Design:
-- * achievements is a global, curated catalog seeded here. Rows MUST match
--   data/preset-achievements.ts (ids, kinds, thresholds, points) — same
--   mirror discipline as the game-math functions in 013.
-- * Award detection is SERVER-SIDE, inside the existing completion grant
--   trigger (handle_completion_change) and a new redemption trigger. After a
--   grant lands, award_achievements() re-reads the profile (level/streak are
--   already updated by the ledger-apply trigger) and evaluates every
--   criterion. Exactly-once is structural, not procedural:
--     - unique (adventurer_id, achievement_id) on adventurer_achievements
--       + ON CONFLICT DO NOTHING → one award row ever;
--     - the ledger's unique (source_type, source_id) index (013) with
--       source_id = the award row id → one points grant ever, even on replay.
-- * Cosmetic purchase is one RPC = one transaction: unlock insert + ledger
--   debit. The achievement_points >= 0 check on adventurer_profiles (006)
--   makes an overdraw roll back BOTH inserts — no negative balances, no
--   "paid but not owned" states. Concurrent taps serialize on the profile
--   row lock taken by the ledger-apply trigger.
-- * avatar_config jsonb is the render model: { "base": 0, "slots":
--   { "head": "<item_key>", ... } }. Only the equip/base RPCs write it for
--   kid devices, keeping it transactionally consistent with the equipped
--   flags on adventurer_cosmetics.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

create table public.achievements (
  id text primary key,
  kind text not null check (kind in
    ('quest_count', 'streak_days', 'level', 'redemption_count', 'required_week')),
  threshold integer not null default 1 check (threshold >= 1),
  points integer not null check (points >= 0),
  created_at timestamptz not null default now()
);

create table public.adventurer_achievements (
  id uuid primary key default gen_random_uuid(),
  adventurer_id uuid not null references public.adventurer_profiles (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (adventurer_id, achievement_id)
);

create index adventurer_achievements_adventurer_id_idx
  on public.adventurer_achievements (adventurer_id);

-- Cosmetic catalog gains a stable client-facing key: art and display names
-- live in the app bundle (theme asset manifests + lexicon), joined on this
-- key — never on the uuid. Table is empty pre-014, so NOT NULL is safe.
alter table public.cosmetic_items
  add column item_key text not null unique,
  add constraint cosmetic_items_slot_check
    check (slot in ('head', 'body', 'accessory'));

-- ---------------------------------------------------------------------------
-- Seeds. MUST match data/preset-achievements.ts and data/cosmetics.ts.
-- ---------------------------------------------------------------------------

insert into public.achievements (id, kind, threshold, points) values
  ('first-quest',      'quest_count',      1,  10),
  ('quests-10',        'quest_count',     10,  15),
  ('quests-25',        'quest_count',     25,  25),
  ('quests-50',        'quest_count',     50,  40),
  ('quests-100',       'quest_count',    100,  75),
  ('quests-250',       'quest_count',    250, 150),
  ('streak-3',         'streak_days',      3,  10),
  ('streak-7',         'streak_days',      7,  25),
  ('streak-14',        'streak_days',     14,  50),
  ('streak-30',        'streak_days',     30, 100),
  ('level-5',          'level',            5,  20),
  ('level-10',         'level',           10,  40),
  ('level-25',         'level',           25,  75),
  ('level-50',         'level',           50, 200),
  ('first-redemption', 'redemption_count', 1,  10),
  ('redemptions-10',   'redemption_count',10,  25),
  ('required-week',    'required_week',    1,  30);

-- name is an internal/admin label; kid-facing names resolve via the lexicon
-- (cosmetic_<key>_name), themed per pack.
insert into public.cosmetic_items (item_key, name, slot, achievement_point_cost, premium_only, season) values
  ('head-starter', 'Starter head',      'head',        0,   false, null),
  ('head-guard',   'Guard head',        'head',        40,  false, null),
  ('head-crown',   'Crown head',        'head',        120, false, null),
  ('head-mythic',  'Mythic head',       'head',        80,  true,  null),
  ('body-starter', 'Starter body',      'body',        0,   false, null),
  ('body-scout',   'Scout body',        'body',        50,  false, null),
  ('body-knight',  'Knight body',       'body',        140, false, null),
  ('body-mythic',  'Mythic body',       'body',        100, true,  null),
  ('acc-starter',  'Starter accessory', 'accessory',   0,   false, null),
  ('acc-charm',    'Charm accessory',   'accessory',   30,  false, null),
  ('acc-banner',   'Banner accessory',  'accessory',   90,  false, null),
  ('acc-mythic',   'Mythic accessory',  'accessory',   60,  true,  'summer-2026');

-- ---------------------------------------------------------------------------
-- Criteria helpers
-- ---------------------------------------------------------------------------

-- "Perfect week": in the 7 days ending p_as_of, at least one day had a
-- required quest due, and every required quest due on every one of those days
-- has an APPROVED completion. Approved-only (stricter than the streak's
-- pending-counts rule) so the award can't be earned off completions a parent
-- later sends back — it lands when the last approval of the week arrives.
create or replace function public.had_full_required_week(p_adventurer_id uuid, p_as_of date)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_day date;
  v_required integer;
  v_missing integer;
  v_any boolean := false;
begin
  for i in 0..6 loop
    v_day := p_as_of - i;
    select count(*) into v_required
      from public.quests q
      where q.archived_at is null
        and q.is_required
        and p_adventurer_id = any (q.assigned_adventurer_ids)
        and public.quest_due_on(q.recurrence, v_day);
    if v_required = 0 then
      continue;
    end if;
    v_any := true;
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
            and c.status = 'approved'
        );
    if v_missing > 0 then
      return false;
    end if;
  end loop;
  return v_any;
end;
$$;

-- ---------------------------------------------------------------------------
-- Award detection. Called from the grant paths below; safe to call any number
-- of times (the unique constraints make re-evaluation idempotent). Reads the
-- profile AFTER the triggering grant, so level and streak are current.
-- Manual NPC ledger adjustments don't re-run detection — a level reached that
-- way is picked up on the kid's next completion.
-- ---------------------------------------------------------------------------

create or replace function public.award_achievements(p_adventurer_id uuid, p_as_of date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_adv public.adventurer_profiles%rowtype;
  v_quest_count integer;
  v_redemption_count integer;
  v_required_week boolean := false;
  v_ach record;
  v_earned boolean;
  v_award_id uuid;
begin
  select * into v_adv from public.adventurer_profiles where id = p_adventurer_id;
  if not found then
    return;
  end if;

  select count(*) into v_quest_count
    from public.quest_completions
    where adventurer_id = p_adventurer_id and status = 'approved';
  select count(*) into v_redemption_count
    from public.loot_redemptions
    where adventurer_id = p_adventurer_id and status = 'approved';

  -- The 7-day scan is the expensive criterion; skip it once earned.
  if exists (
    select 1 from public.achievements a
    where a.kind = 'required_week'
      and not exists (
        select 1 from public.adventurer_achievements aa
        where aa.adventurer_id = p_adventurer_id and aa.achievement_id = a.id
      )
  ) then
    v_required_week := public.had_full_required_week(p_adventurer_id, p_as_of);
  end if;

  for v_ach in select * from public.achievements loop
    v_earned := case v_ach.kind
      when 'quest_count' then v_quest_count >= v_ach.threshold
      when 'streak_days' then
        greatest(v_adv.current_streak_days, v_adv.longest_streak_days) >= v_ach.threshold
      when 'level' then v_adv.level >= v_ach.threshold
      when 'redemption_count' then v_redemption_count >= v_ach.threshold
      when 'required_week' then v_required_week
      else false
    end;
    if not v_earned then
      continue;
    end if;

    insert into public.adventurer_achievements (adventurer_id, achievement_id)
      values (p_adventurer_id, v_ach.id)
      on conflict (adventurer_id, achievement_id) do nothing
      returning id into v_award_id;
    if v_award_id is null then
      continue; -- already earned
    end if;

    insert into public.gold_xp_ledger
        (adventurer_id, delta_gold, delta_xp, delta_achievement_points, source_type, source_id)
      values (p_adventurer_id, 0, 0, v_ach.points, 'achievement', v_award_id)
      on conflict (source_type, source_id) do nothing;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Hook detection into the completion grant path. Identical to 013 except for
-- the award_achievements calls at the end of the grant branch.
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

  -- Achievement detection, in the same transaction as the grant. Level and
  -- streak on the profile are current at this point (the ledger-apply trigger
  -- ran synchronously during the inserts above; the streak update just ran).
  perform public.award_achievements(new.adventurer_id, new.due_date);

  return new;
end;
$$;

-- Redemption-driven achievements (first redemption, etc.) hook the approval
-- transition the same way. (Gold deduction for redemptions lands with the
-- loot feature; this trigger only runs detection.)
create or replace function public.handle_redemption_award()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved'
     and (tg_op = 'INSERT' or new.status is distinct from old.status) then
    perform public.award_achievements(new.adventurer_id, (now() at time zone 'utc')::date);
  end if;
  return new;
end;
$$;

create trigger loot_redemptions_award
  after insert or update of status on public.loot_redemptions
  for each row
  execute function public.handle_redemption_award();

-- ---------------------------------------------------------------------------
-- Cosmetic purchase: one atomic transaction. Returns a status string the
-- client renders through the lexicon:
--   'purchased' | 'already_owned' | 'insufficient_points' | 'premium_required'
-- ---------------------------------------------------------------------------

-- Caller must be the bound kid device for this adventurer, or an NPC of the
-- adventurer's guild (single-device mode toggle).
create or replace function public.can_act_for_adventurer(p_adventurer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_adventurer_id = public.bound_adventurer_id()
      or public.is_guild_npc(public.adventurer_guild_id(p_adventurer_id));
$$;

create or replace function public.purchase_cosmetic(p_adventurer_id uuid, p_cosmetic_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.cosmetic_items%rowtype;
  v_unlock uuid;
begin
  if not public.can_act_for_adventurer(p_adventurer_id) then
    raise exception 'not authorized';
  end if;

  select * into v_item from public.cosmetic_items where id = p_cosmetic_id;
  if not found then
    raise exception 'cosmetic not found';
  end if;

  -- Server-side premium enforcement (the client lock is cosmetic only).
  if v_item.premium_only and not exists (
    select 1 from public.guilds g
    where g.id = public.adventurer_guild_id(p_adventurer_id)
      and g.subscription_entitlement = 'premium'
  ) then
    return 'premium_required';
  end if;

  -- The block is a savepoint: an overdraw (check_violation from the
  -- achievement_points >= 0 constraint, raised by the ledger-apply trigger)
  -- rolls back the unlock insert together with the debit.
  begin
    insert into public.adventurer_cosmetics (adventurer_id, cosmetic_id)
      values (p_adventurer_id, p_cosmetic_id)
      on conflict (adventurer_id, cosmetic_id) do nothing
      returning id into v_unlock;
    if v_unlock is null then
      return 'already_owned';
    end if;

    -- Starter items are free: no ledger noise for a zero debit.
    if v_item.achievement_point_cost > 0 then
      insert into public.gold_xp_ledger
          (adventurer_id, delta_gold, delta_xp, delta_achievement_points, source_type, source_id)
        values (p_adventurer_id, 0, 0, -v_item.achievement_point_cost, 'cosmetic_purchase', v_unlock);
    end if;
    return 'purchased';
  exception
    when check_violation then
      return 'insufficient_points';
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- Equip/unequip. Keeps the equipped flags and the avatar_config render model
-- in one transaction. One equipped item per slot.
-- ---------------------------------------------------------------------------

create or replace function public.set_equipped_cosmetic(
  p_adventurer_id uuid,
  p_cosmetic_id uuid,
  p_equipped boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.cosmetic_items%rowtype;
  v_owned uuid;
begin
  if not public.can_act_for_adventurer(p_adventurer_id) then
    raise exception 'not authorized';
  end if;

  select * into v_item from public.cosmetic_items where id = p_cosmetic_id;
  if not found then
    raise exception 'cosmetic not found';
  end if;

  select id into v_owned
    from public.adventurer_cosmetics
    where adventurer_id = p_adventurer_id and cosmetic_id = p_cosmetic_id;
  if v_owned is null then
    raise exception 'cosmetic not owned';
  end if;

  -- Serialize concurrent equips for the same adventurer.
  perform 1 from public.adventurer_profiles where id = p_adventurer_id for update;

  if p_equipped then
    update public.adventurer_cosmetics ac
      set equipped = false
      from public.cosmetic_items ci
      where ci.id = ac.cosmetic_id
        and ac.adventurer_id = p_adventurer_id
        and ac.equipped
        and ci.slot = v_item.slot
        and ac.cosmetic_id <> p_cosmetic_id;
    update public.adventurer_cosmetics set equipped = true where id = v_owned;

    update public.adventurer_profiles
      set avatar_config = jsonb_set(
        case when coalesce(avatar_config, '{}'::jsonb) ? 'slots'
             then coalesce(avatar_config, '{}'::jsonb)
             else coalesce(avatar_config, '{}'::jsonb) || '{"slots":{}}'::jsonb
        end,
        array['slots', v_item.slot],
        to_jsonb(v_item.item_key))
      where id = p_adventurer_id;
  else
    update public.adventurer_cosmetics set equipped = false where id = v_owned;

    update public.adventurer_profiles
      set avatar_config = jsonb_set(
        coalesce(avatar_config, '{}'::jsonb),
        '{slots}',
        coalesce(avatar_config -> 'slots', '{}'::jsonb) - v_item.slot)
      where id = p_adventurer_id;
  end if;
end;
$$;

-- Base body choice (index into the theme pack's avatarBases).
create or replace function public.set_avatar_base(p_adventurer_id uuid, p_base integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_act_for_adventurer(p_adventurer_id) then
    raise exception 'not authorized';
  end if;
  if p_base < 0 or p_base > 7 then
    raise exception 'invalid base index';
  end if;
  update public.adventurer_profiles
    set avatar_config = coalesce(avatar_config, '{}'::jsonb)
      || jsonb_build_object('base', p_base)
    where id = p_adventurer_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS + grants
-- ---------------------------------------------------------------------------

alter table public.achievements enable row level security;
alter table public.adventurer_achievements enable row level security;

-- TEST INTENT: any authenticated identity browses the achievement catalog;
-- nobody writes it from the client.
create policy achievements_select on public.achievements
  for select to authenticated
  using (true);

-- TEST INTENT: NPCs see awards for adventurers in their guilds; a kid device
-- sees only its own awards, never a sibling's. No client INSERT path exists —
-- only award_achievements (definer) creates rows.
create policy adventurer_achievements_npc_select on public.adventurer_achievements
  for select to authenticated
  using (public.is_guild_npc(public.adventurer_guild_id(adventurer_id)));

create policy adventurer_achievements_device_select on public.adventurer_achievements
  for select to authenticated
  using (adventurer_id = public.bound_adventurer_id());

grant select on public.achievements to authenticated;
grant select on public.adventurer_achievements to authenticated;

-- Detection runs only from the grant triggers, never from clients.
revoke execute on function public.award_achievements(uuid, date) from public, anon, authenticated;
revoke execute on function public.had_full_required_week(uuid, date) from public, anon, authenticated;

grant execute on function public.can_act_for_adventurer(uuid) to authenticated;
grant execute on function public.purchase_cosmetic(uuid, uuid) to authenticated;
grant execute on function public.set_equipped_cosmetic(uuid, uuid, boolean) to authenticated;
grant execute on function public.set_avatar_base(uuid, integer) to authenticated;

alter publication supabase_realtime add table public.adventurer_achievements;
