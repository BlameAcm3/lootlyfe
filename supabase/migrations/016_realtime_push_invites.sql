-- Realtime + Push + Co-parent invites (features 22/23/24).
--
-- This migration makes multi-device "feel alive":
--   * Realtime: REPLICA IDENTITY FULL on the adventurer-scoped tables so kid
--     devices can filter realtime UPDATE/DELETE payloads by adventurer_id (the
--     guild tables already carry guild_id and are in the supabase_realtime
--     publication from 006).
--   * Push: a pg_net delivery helper (enqueue_push) called by AFTER triggers on
--     the events that matter, a SQL recipient resolver (resolve_push_targets)
--     that honors notification_preferences + quiet hours, and a per-NPC quiet
--     hours table. The send-push Edge Function composes copy and posts to Expo.
--   * Co-parent invites: guild_invites table + create/accept RPCs, premium-gated
--     (free = 1 NPC, premium = up to 4).
--
-- Reward/grant logic (013/015) is intentionally untouched; the notify triggers
-- are independent AFTER triggers.

-- ===========================================================================
-- 1. Realtime: full row images for adventurer-scoped tables.
-- Default REPLICA IDENTITY is the PK only, so a kid device's
-- filter=adventurer_id=eq.<id> would miss UPDATE/DELETE (old row lacks the
-- column). FULL ships every column on every change.
-- ===========================================================================
alter table public.quest_completions replica identity full;
alter table public.loot_redemptions replica identity full;
alter table public.loot_wishlist replica identity full;

-- ===========================================================================
-- 2. Push delivery plumbing (pg_net).
-- private.push_config holds the send-push URL + service-role key so secrets
-- stay out of git and the target is environment-portable. Operator populates
-- it once per environment (documented in README/acceptance). When empty,
-- enqueue_push is a no-op so application writes NEVER fail because push is
-- unconfigured.
-- ===========================================================================
create schema if not exists private;
revoke all on schema private from public;

create table if not exists private.push_config (
  id integer primary key default 1 check (id = 1),
  function_url text,
  service_key text
);
insert into private.push_config (id) values (1) on conflict (id) do nothing;

-- Fire-and-forget POST to send-push. pg_net queues the request and returns
-- immediately, so a delivery problem can never roll back the originating
-- transaction (a completed quest stays completed even if push is down).
create or replace function public.enqueue_push(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
begin
  select function_url, service_key into v_url, v_key from private.push_config where id = 1;
  if v_url is null or v_url = '' then
    return; -- push not configured in this environment: no-op
  end if;
  perform net.http_post(
    url := v_url,
    body := p_payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_key, '')
    )
  );
exception when others then
  -- Never let a push hiccup abort the user's action.
  return;
end;
$$;

-- ===========================================================================
-- 3. Quiet hours: per-NPC settings (the notification_preferences rows from 006
-- stay the per-event / per-adventurer mute matrix).
--
-- notification_preferences encoding convention (consumed by resolve_push_targets):
--   * mute an event type:  (npc_id, channel=<event_type>, scope_type='event',     scope_id=null,          enabled=false)
--   * mute an adventurer:  (npc_id, channel='all',        scope_type='adventurer', scope_id=<adventurer>,  enabled=false)
-- ===========================================================================
create table public.npc_notification_settings (
  npc_id uuid primary key references public.npc_profiles (id) on delete cascade,
  master_enabled boolean not null default true,
  quiet_hours_start time,            -- null = no quiet hours
  quiet_hours_end time,
  timezone text not null default 'UTC'
);

alter table public.npc_notification_settings enable row level security;

-- An NPC manages ONLY their own settings (mirrors notification_preferences_own_all).
create policy npc_notification_settings_own_all on public.npc_notification_settings
  for all to authenticated
  using (
    exists (
      select 1 from public.npc_profiles np
      where np.id = npc_id and np.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.npc_profiles np
      where np.id = npc_id and np.user_id = (select auth.uid())
    )
  );

grant select, insert, update, delete on public.npc_notification_settings to authenticated;

-- True when "now", in the NPC's timezone, falls inside the quiet window.
-- Handles windows that wrap midnight (e.g. 22:00 -> 07:00).
create or replace function public.in_quiet_hours(
  p_start time,
  p_end time,
  p_tz text
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when p_start is null or p_end is null then false
    else (
      with t as (select (now() at time zone coalesce(p_tz, 'UTC'))::time as now_local)
      select case
        when p_start <= p_end then now_local >= p_start and now_local < p_end
        else now_local >= p_start or now_local < p_end
      end
      from t
    )
  end;
$$;

-- ===========================================================================
-- 4. Recipient resolution (the testable core of "respect preferences").
-- Returns the device push tokens that should receive a given event. NPC-class
-- events honor master mute / per-event mute / per-adventurer mute / quiet
-- hours; celebration-class events go to the kid's bound devices with NO
-- filtering (kids get celebration only, never marketing).
-- service_role only: the send-push Edge Function calls it.
-- ===========================================================================
create or replace function public.resolve_push_targets(
  p_type text,
  p_guild_id uuid,
  p_adventurer_id uuid
)
returns table (user_id uuid, token text, platform text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_type in ('quest_completed', 'redemption_requested', 'invite_accepted', 'wishlist_proposed') then
    -- NPC-class: every NPC in the guild, minus their mutes / quiet hours.
    return query
      select t.user_id, t.token, t.platform
      from public.npc_profiles np
      join public.device_push_tokens t on t.user_id = np.user_id
      left join public.npc_notification_settings s on s.npc_id = np.id
      where np.guild_id = p_guild_id
        and coalesce(s.master_enabled, true) = true
        and not public.in_quiet_hours(s.quiet_hours_start, s.quiet_hours_end, coalesce(s.timezone, 'UTC'))
        and not exists (
          select 1 from public.notification_preferences pf
          where pf.npc_id = np.id
            and pf.scope_type = 'event'
            and pf.channel = p_type
            and pf.enabled = false
        )
        and (
          p_adventurer_id is null
          or not exists (
            select 1 from public.notification_preferences pf
            where pf.npc_id = np.id
              and pf.scope_type = 'adventurer'
              and pf.scope_id = p_adventurer_id
              and pf.enabled = false
          )
        );
  else
    -- Celebration-class: the kid's own unrevoked devices only.
    return query
      select t.user_id, t.token, t.platform
      from public.device_bindings b
      join public.device_push_tokens t on t.user_id = b.user_id
      where b.adventurer_id = p_adventurer_id
        and b.revoked_at is null;
  end if;
end;
$$;

revoke all on function public.resolve_push_targets(text, uuid, uuid) from public;
grant execute on function public.resolve_push_targets(text, uuid, uuid) to service_role;

-- ===========================================================================
-- 5. Notify triggers. Each is SECURITY DEFINER (owned by the migration role)
-- so it can read names across RLS and call enqueue_push without granting
-- enqueue_push to clients. Triggers pass type + ids + display data + a deep
-- link route; the Edge Function composes the (NPC- or kid-appropriate) copy.
-- ===========================================================================

-- Quest completions: pending (needs approval) -> NPCs; resolved -> kid.
create or replace function public.notify_completion_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guild_id uuid;
  v_quest_title text;
  v_nickname text;
  v_requires_approval boolean;
begin
  select q.guild_id, q.title, q.requires_approval
    into v_guild_id, v_quest_title, v_requires_approval
    from public.quests q where q.id = new.quest_id;
  select ap.nickname into v_nickname
    from public.adventurer_profiles ap where ap.id = new.adventurer_id;

  if tg_op = 'INSERT' then
    -- Only quests that actually require approval generate an NPC alert; the
    -- auto-approve path (013) flips no-approval quests to approved immediately.
    if new.status = 'pending' and v_requires_approval then
      perform public.enqueue_push(jsonb_build_object(
        'type', 'quest_completed',
        'guild_id', v_guild_id,
        'adventurer_id', new.adventurer_id,
        'route', '/(parent)/approvals',
        'data', jsonb_build_object('nickname', v_nickname, 'quest_title', v_quest_title)
      ));
    end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'approved' then
      perform public.enqueue_push(jsonb_build_object(
        'type', 'quest_approved',
        'guild_id', v_guild_id,
        'adventurer_id', new.adventurer_id,
        'route', '/(adventurer)',
        'data', jsonb_build_object('quest_title', v_quest_title)
      ));
    elsif new.status = 'rejected' then
      perform public.enqueue_push(jsonb_build_object(
        'type', 'quest_rejected',
        'guild_id', v_guild_id,
        'adventurer_id', new.adventurer_id,
        'route', '/(adventurer)',
        'data', jsonb_build_object('quest_title', v_quest_title)
      ));
    end if;
  end if;
  return null; -- AFTER trigger
end;
$$;

create trigger quest_completions_notify
  after insert or update of status on public.quest_completions
  for each row execute function public.notify_completion_change();

-- Loot redemptions: requested -> NPCs; resolved -> kid.
create or replace function public.notify_redemption_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guild_id uuid;
  v_loot_name text;
  v_nickname text;
begin
  select li.guild_id, li.name into v_guild_id, v_loot_name
    from public.loot_items li where li.id = new.loot_id;
  select ap.nickname into v_nickname
    from public.adventurer_profiles ap where ap.id = new.adventurer_id;

  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform public.enqueue_push(jsonb_build_object(
        'type', 'redemption_requested',
        'guild_id', v_guild_id,
        'adventurer_id', new.adventurer_id,
        'route', '/(parent)/fulfillment',
        'data', jsonb_build_object('nickname', v_nickname, 'loot_name', v_loot_name)
      ));
    end if;
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'approved' then
      perform public.enqueue_push(jsonb_build_object(
        'type', 'redemption_approved',
        'guild_id', v_guild_id,
        'adventurer_id', new.adventurer_id,
        'route', '/(adventurer)/redemptions',
        'data', jsonb_build_object('loot_name', v_loot_name)
      ));
    elsif new.status = 'rejected' then
      perform public.enqueue_push(jsonb_build_object(
        'type', 'redemption_denied',
        'guild_id', v_guild_id,
        'adventurer_id', new.adventurer_id,
        'route', '/(adventurer)/redemptions',
        'data', jsonb_build_object('loot_name', v_loot_name)
      ));
    end if;
  end if;
  return null;
end;
$$;

create trigger loot_redemptions_notify
  after insert or update of status on public.loot_redemptions
  for each row execute function public.notify_redemption_change();

-- Level up: the grant trigger (013) writes a 'level_up' ledger row AFTER the
-- quest_completion row has already bumped xp_total/level via the ledger
-- aggregate trigger, so adventurer_profiles.level is the NEW level here.
create or replace function public.notify_level_up()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_guild_id uuid;
  v_level integer;
begin
  select ap.guild_id, ap.level into v_guild_id, v_level
    from public.adventurer_profiles ap where ap.id = new.adventurer_id;
  perform public.enqueue_push(jsonb_build_object(
    'type', 'level_up',
    'guild_id', v_guild_id,
    'adventurer_id', new.adventurer_id,
    'route', '/(adventurer)',
    'data', jsonb_build_object('level', v_level)
  ));
  return null;
end;
$$;

create trigger gold_xp_ledger_notify_level_up
  after insert on public.gold_xp_ledger
  for each row when (new.source_type = 'level_up')
  execute function public.notify_level_up();

-- Streak milestones: fire only when the streak grows INTO a milestone value
-- (the WHEN clause keeps this off the hot path of every aggregate update).
create or replace function public.notify_streak_milestone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.enqueue_push(jsonb_build_object(
    'type', 'streak_milestone',
    'guild_id', new.guild_id,
    'adventurer_id', new.id,
    'route', '/(adventurer)',
    'data', jsonb_build_object('days', new.current_streak_days)
  ));
  return null;
end;
$$;

create trigger adventurer_profiles_notify_streak
  after update on public.adventurer_profiles
  for each row
  when (
    new.current_streak_days > old.current_streak_days
    and new.current_streak_days in (7, 14, 30, 60, 100)
  )
  execute function public.notify_streak_milestone();

-- ===========================================================================
-- 6. Co-parent invites.
-- ===========================================================================
create table public.guild_invites (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  code char(8) not null unique,
  invited_by_npc_id uuid not null references public.npc_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by_npc_id uuid references public.npc_profiles (id) on delete set null
);

create index guild_invites_guild_id_idx on public.guild_invites (guild_id);
create index guild_invites_code_idx on public.guild_invites (code);

alter table public.guild_invites enable row level security;

-- NPCs can see/manage invites for their own guild (so an NPC can list/revoke
-- pending invites). Acceptance is the SECURITY DEFINER RPC below, which a
-- prospective co-parent (not yet a guild member) can call.
create policy guild_invites_guild_npc_select on public.guild_invites
  for select to authenticated
  using (public.is_guild_npc(guild_id));

create policy guild_invites_guild_npc_delete on public.guild_invites
  for delete to authenticated
  using (public.is_guild_npc(guild_id));

grant select, delete on public.guild_invites to authenticated;

-- Premium gate + 4-NPC cap, shared by create and accept. Returns nothing;
-- raises on violation. p_extra is the number of seats the action would add.
create or replace function public.assert_npc_seat_available(p_guild_id uuid, p_extra integer)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_entitlement text;
  v_count integer;
  v_limit integer;
begin
  select subscription_entitlement into v_entitlement from public.guilds where id = p_guild_id;
  if v_entitlement is null then
    raise exception 'guild not found';
  end if;
  -- Free tier (Apprentice Guild) = 1 NPC, owner only. Premium = up to 4.
  v_limit := case when v_entitlement = 'premium' then 4 else 1 end;
  select count(*) into v_count from public.npc_profiles where guild_id = p_guild_id;
  if v_count + p_extra > v_limit then
    if v_entitlement = 'premium' then
      raise exception 'npc_seat_limit_reached';
    else
      raise exception 'premium_required';
    end if;
  end if;
end;
$$;

-- Mint an 8-char invite code. Caller must be an NPC of the guild and there
-- must be a free co-parent seat (premium-gated). Returns the new code.
create or replace function public.create_guild_invite()
returns table (code char(8), expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Unambiguous alphabet (no 0/O/1/I/L) for codes read aloud / typed by hand.
  v_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_guild_id uuid;
  v_npc_id uuid;
  v_code text;
  i integer;
begin
  select id, guild_id into v_npc_id, v_guild_id
    from public.npc_profiles
    where user_id = (select auth.uid())
    order by created_at asc
    limit 1;
  if v_npc_id is null then
    raise exception 'not_a_guild_npc';
  end if;

  -- Accepting this invite would add one seat: gate on that.
  perform public.assert_npc_seat_available(v_guild_id, 1);

  -- Unique by retry on the rare collision.
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;
    begin
      insert into public.guild_invites (guild_id, code, invited_by_npc_id)
        values (v_guild_id, v_code, v_npc_id);
      exit;
    exception when unique_violation then
      -- retry with a fresh code
    end;
  end loop;

  return query
    select gi.code, gi.expires_at from public.guild_invites gi where gi.code = v_code;
end;
$$;

grant execute on function public.create_guild_invite() to authenticated;

-- Accept an invite: attaches the signed-in (full) user to the guild as an
-- admin NPC, logs consent, and notifies the existing NPCs. Atomic.
create or replace function public.accept_guild_invite(
  p_code text,
  p_display_name text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.guild_invites%rowtype;
  v_uid uuid := (select auth.uid());
  v_npc_id uuid;
begin
  if not public.is_full_user() then
    raise exception 'requires_full_account';
  end if;

  select * into v_invite
    from public.guild_invites
    where code = upper(trim(p_code))
    for update;
  if not found then
    raise exception 'invite_not_found';
  end if;
  if v_invite.accepted_at is not null then
    raise exception 'invite_already_used';
  end if;
  if v_invite.expires_at <= now() then
    raise exception 'invite_expired';
  end if;

  -- Already a member? Idempotent-ish: surface clearly instead of duplicating.
  if exists (
    select 1 from public.npc_profiles
    where guild_id = v_invite.guild_id and user_id = v_uid
  ) then
    raise exception 'already_member';
  end if;

  -- Re-check the seat under the row lock (a racing accept can't exceed the cap).
  perform public.assert_npc_seat_available(v_invite.guild_id, 1);

  insert into public.npc_profiles (user_id, guild_id, role, display_name)
    values (v_uid, v_invite.guild_id, 'admin',
            coalesce(nullif(trim(p_display_name), ''), 'Co-Parent'))
    returning id into v_npc_id;

  update public.guild_invites
    set accepted_at = now(), accepted_by_npc_id = v_npc_id
    where id = v_invite.id;

  insert into public.consent_events (guild_id, npc_id, type, method)
    values (v_invite.guild_id, v_npc_id, 'coparent_invite_accepted', 'invite_code');

  perform public.enqueue_push(jsonb_build_object(
    'type', 'invite_accepted',
    'guild_id', v_invite.guild_id,
    'adventurer_id', null,
    'route', '/(parent)/family',
    'data', jsonb_build_object('display_name',
      coalesce(nullif(trim(p_display_name), ''), 'A co-parent'))
  ));

  return v_invite.guild_id;
end;
$$;

grant execute on function public.accept_guild_invite(text, text) to authenticated;
