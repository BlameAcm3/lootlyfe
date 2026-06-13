-- 017_premium_enforcement.sql
--
-- Server-side free-tier enforcement (client checks are UX; these are the law)
-- and account/guild deletion for the monetization + compliance pass.
--
-- 1. BEFORE INSERT triggers on adventurer_profiles / quests / loot_items reject
--    creation past the free-tier limits for non-premium guilds. They mirror
--    constants/game.ts FREE_TIER_LIMITS (adventurers 2, custom_quests 10,
--    custom_loot 5) and the count definitions the client uses. Co-parent NPC
--    seats are already enforced in migration 016 (assert_npc_seat_available).
--    The triggers ONLY block new rows — existing over-limit rows after a
--    downgrade are retained (read-only), never deleted.
--
-- 2. delete_guild(): owner-only cascading guild deletion that RETAINS consent
--    events (COPPA audit trail) by copying them into private.retained_consent_events
--    before the cascade removes the originals.

-- ---------------------------------------------------------------------------
-- 1. Free-tier INSERT guards
-- ---------------------------------------------------------------------------

-- Adventurers: free guilds cap at 2 active (non-archived) profiles.
create or replace function public.enforce_adventurer_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entitlement text;
  v_count integer;
begin
  select subscription_entitlement into v_entitlement
    from public.guilds where id = new.guild_id;
  if v_entitlement is null then
    raise exception 'guild not found';
  end if;
  if v_entitlement = 'premium' then
    return new;
  end if;
  select count(*) into v_count
    from public.adventurer_profiles
    where guild_id = new.guild_id and archived_at is null;
  if v_count >= 2 then
    raise exception 'adventurer_limit_reached';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_adventurer_limit on public.adventurer_profiles;
create trigger trg_enforce_adventurer_limit
  before insert on public.adventurer_profiles
  for each row execute function public.enforce_adventurer_limit();

-- Custom quests: free guilds cap at 10 active custom quests. Preset-sourced
-- quests (source_preset_id is not null) are exempt, matching isActiveCustomQuest.
create or replace function public.enforce_quest_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entitlement text;
  v_count integer;
begin
  -- Preset-sourced quests never count against the custom limit.
  if new.source_preset_id is not null then
    return new;
  end if;
  select subscription_entitlement into v_entitlement
    from public.guilds where id = new.guild_id;
  if v_entitlement is null then
    raise exception 'guild not found';
  end if;
  if v_entitlement = 'premium' then
    return new;
  end if;
  select count(*) into v_count
    from public.quests
    where guild_id = new.guild_id
      and source_preset_id is null
      and archived_at is null;
  if v_count >= 10 then
    raise exception 'quest_limit_reached';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_quest_limit on public.quests;
create trigger trg_enforce_quest_limit
  before insert on public.quests
  for each row execute function public.enforce_quest_limit();

-- Custom loot: free guilds cap at 5 loot items (every loot_items row counts).
create or replace function public.enforce_loot_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entitlement text;
  v_count integer;
begin
  select subscription_entitlement into v_entitlement
    from public.guilds where id = new.guild_id;
  if v_entitlement is null then
    raise exception 'guild not found';
  end if;
  if v_entitlement = 'premium' then
    return new;
  end if;
  select count(*) into v_count
    from public.loot_items
    where guild_id = new.guild_id;
  if v_count >= 5 then
    raise exception 'loot_limit_reached';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_loot_limit on public.loot_items;
create trigger trg_enforce_loot_limit
  before insert on public.loot_items
  for each row execute function public.enforce_loot_limit();

-- ---------------------------------------------------------------------------
-- 2. Guild deletion with retained consent events
-- ---------------------------------------------------------------------------

-- Compliance audit trail: consent events survive guild deletion. The `private`
-- schema is not exposed to the API, so these are only reachable via service
-- role / security-definer functions.
create schema if not exists private;

create table if not exists private.retained_consent_events (
  id uuid primary key default gen_random_uuid(),
  original_event_id uuid not null,
  guild_id uuid not null,
  guild_name text,
  npc_id uuid not null,
  type text not null,
  method text not null,
  consented_at timestamptz not null,
  retained_at timestamptz not null default now()
);

-- Owner-only, atomic. Copies consent events into the audit table, then deletes
-- the guild (ON DELETE CASCADE removes adventurers, quests, loot, devices,
-- ledger, and the now-archived consent_events rows).
create or replace function public.delete_guild(p_guild_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_owner boolean;
  v_guild_name text;
begin
  select exists (
    select 1 from public.npc_profiles
    where guild_id = p_guild_id
      and user_id = (select auth.uid())
      and role = 'owner'
  ) into v_is_owner;
  if not v_is_owner then
    raise exception 'not_guild_owner';
  end if;

  select name into v_guild_name from public.guilds where id = p_guild_id;

  insert into private.retained_consent_events
    (original_event_id, guild_id, guild_name, npc_id, type, method, consented_at)
  select ce.id, ce.guild_id, v_guild_name, ce.npc_id, ce.type, ce.method, ce.created_at
    from public.consent_events ce
    where ce.guild_id = p_guild_id;

  delete from public.guilds where id = p_guild_id;
end;
$$;

grant execute on function public.delete_guild(uuid) to authenticated;
