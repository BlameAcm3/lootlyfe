-- Guild-domain schema per AGENTS.md > Data Model.
-- Coexists with the legacy family/chore schema (001-005); the legacy tables
-- are dropped in a later pass once app code has migrated to the guild domain.
--
-- Conventions:
--   * All money/points columns are integers.
--   * gold_balance / xp_total / level / achievement_points on
--     adventurer_profiles are DERIVED — only the gold_xp_ledger trigger
--     (security definer) may write them. Client roles get column-level
--     update grants that exclude them.

-- ---------------------------------------------------------------------------
-- guilds
-- owner_npc_id is nullable because guild and owner profile are created in
-- sequence (guild first, then the owner npc_profile, then the back-reference).
-- ---------------------------------------------------------------------------
create table public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  crest text,
  owner_npc_id uuid,
  subscription_entitlement text not null default 'free'
    check (subscription_entitlement in ('free', 'premium')),
  created_at timestamptz not null default now()
);

create table public.npc_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  guild_id uuid not null references public.guilds (id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  display_name text not null,
  avatar text,
  created_at timestamptz not null default now(),
  unique (user_id, guild_id)
);

alter table public.guilds
  add constraint guilds_owner_npc_id_fkey
  foreign key (owner_npc_id) references public.npc_profiles (id);

-- ---------------------------------------------------------------------------
-- adventurer_profiles
-- Children are profiles, not accounts (COPPA): nickname + age bucket only.
-- The non-negative checks on derived columns make the ledger trigger fail
-- atomically on overdraw (e.g. two rapid redemptions racing past the balance).
-- ---------------------------------------------------------------------------
create table public.adventurer_profiles (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  nickname text not null,
  age_bucket text not null check (age_bucket in ('5-8', '9-12', '13+')),
  avatar_config jsonb not null default '{}'::jsonb,
  theme_id text not null default 'high-fantasy',
  variant_id text not null default 'default',
  gold_balance integer not null default 0 check (gold_balance >= 0),
  xp_total integer not null default 0 check (xp_total >= 0),
  level integer not null default 1 check (level >= 1),
  achievement_points integer not null default 0 check (achievement_points >= 0),
  current_streak_days integer not null default 0,
  longest_streak_days integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- device_bindings (replaces the old device_tokens concept)
-- One row per paired kid device: an anonymous auth user bound to an
-- adventurer. Written only by the pair-device Edge Function (service role).
-- Revocation = set revoked_at; every adventurer-scope RLS policy requires an
-- unrevoked binding.
-- ---------------------------------------------------------------------------
create table public.device_bindings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  adventurer_id uuid not null references public.adventurer_profiles (id) on delete cascade,
  guild_id uuid not null references public.guilds (id) on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

-- ---------------------------------------------------------------------------
-- pairing_codes
-- Parent-generated 6-digit codes, valid 10 minutes (expires_at is set by the
-- client/NPC at insert), single-use (consumed_at set by pair-device).
-- ---------------------------------------------------------------------------
create table public.pairing_codes (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  adventurer_id uuid not null references public.adventurer_profiles (id) on delete cascade,
  code text not null check (code ~ '^[0-9]{6}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_by_npc_id uuid not null references public.npc_profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  title text not null,
  description text,
  category text,
  xp_reward integer not null default 0 check (xp_reward >= 0),
  gold_reward integer not null default 0 check (gold_reward >= 0),
  is_required boolean not null default false,
  requires_approval boolean not null default true,
  recurrence jsonb,
  assigned_adventurer_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.quest_completions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references public.quests (id) on delete cascade,
  adventurer_id uuid not null references public.adventurer_profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by_npc_id uuid references public.npc_profiles (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  proof_url text
);

create table public.loot_items (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  name text not null,
  description text,
  gold_cost integer not null check (gold_cost >= 0),
  stock integer check (stock >= 0), -- null = unlimited
  created_by_npc_id uuid not null references public.npc_profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.loot_redemptions (
  id uuid primary key default gen_random_uuid(),
  loot_id uuid not null references public.loot_items (id) on delete cascade,
  adventurer_id uuid not null references public.adventurer_profiles (id) on delete cascade,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by_npc_id uuid references public.npc_profiles (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  gold_spent integer not null check (gold_spent >= 0)
);

create table public.loot_wishlist (
  id uuid primary key default gen_random_uuid(),
  adventurer_id uuid not null references public.adventurer_profiles (id) on delete cascade,
  name text not null,
  description text,
  proposed_gold_cost integer check (proposed_gold_cost >= 0),
  status text not null default 'proposed' check (status in ('proposed', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);

-- Global cosmetic catalog (not guild-scoped). Content is curated by us, not
-- by guilds; rows arrive via seed/admin tooling, never via client writes.
create table public.cosmetic_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slot text not null,
  achievement_point_cost integer not null default 0 check (achievement_point_cost >= 0),
  premium_only boolean not null default false,
  season text,
  created_at timestamptz not null default now()
);

create table public.adventurer_cosmetics (
  id uuid primary key default gen_random_uuid(),
  adventurer_id uuid not null references public.adventurer_profiles (id) on delete cascade,
  cosmetic_id uuid not null references public.cosmetic_items (id) on delete cascade,
  equipped boolean not null default false,
  unlocked_at timestamptz not null default now(),
  unique (adventurer_id, cosmetic_id)
);

-- ---------------------------------------------------------------------------
-- gold_xp_ledger — append-only audit trail and the ONLY write path for the
-- derived aggregates on adventurer_profiles (see trigger below). No update or
-- delete is ever granted on this table.
-- ---------------------------------------------------------------------------
create table public.gold_xp_ledger (
  id uuid primary key default gen_random_uuid(),
  adventurer_id uuid not null references public.adventurer_profiles (id) on delete cascade,
  delta_gold integer not null default 0,
  delta_xp integer not null default 0,
  delta_achievement_points integer not null default 0,
  source_type text not null,
  source_id uuid,
  created_at timestamptz not null default now()
);

create table public.consent_events (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds (id) on delete cascade,
  npc_id uuid not null references public.npc_profiles (id) on delete cascade,
  type text not null,
  method text not null,
  created_at timestamptz not null default now()
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  npc_id uuid not null references public.npc_profiles (id) on delete cascade,
  channel text not null,
  scope_type text not null,
  scope_id uuid,
  enabled boolean not null default true,
  unique (npc_id, channel, scope_type, scope_id)
);

-- ---------------------------------------------------------------------------
-- Indexes for guild-scoped and adventurer-scoped lookups (RLS predicates and
-- the app's main queries all filter on these).
-- ---------------------------------------------------------------------------
create index npc_profiles_user_id_idx on public.npc_profiles (user_id);
create index npc_profiles_guild_id_idx on public.npc_profiles (guild_id);
create index adventurer_profiles_guild_id_idx on public.adventurer_profiles (guild_id);
create index device_bindings_user_id_idx on public.device_bindings (user_id);
create index device_bindings_adventurer_id_idx on public.device_bindings (adventurer_id);
create index pairing_codes_code_idx on public.pairing_codes (code);
create index quests_guild_id_idx on public.quests (guild_id);
create index quest_completions_quest_id_idx on public.quest_completions (quest_id);
create index quest_completions_adventurer_id_idx on public.quest_completions (adventurer_id);
create index loot_items_guild_id_idx on public.loot_items (guild_id);
create index loot_redemptions_loot_id_idx on public.loot_redemptions (loot_id);
create index loot_redemptions_adventurer_id_idx on public.loot_redemptions (adventurer_id);
create index loot_wishlist_adventurer_id_idx on public.loot_wishlist (adventurer_id);
create index adventurer_cosmetics_adventurer_id_idx on public.adventurer_cosmetics (adventurer_id);
create index gold_xp_ledger_adventurer_id_idx on public.gold_xp_ledger (adventurer_id);
create index consent_events_guild_id_idx on public.consent_events (guild_id);
create index notification_preferences_npc_id_idx on public.notification_preferences (npc_id);

-- ---------------------------------------------------------------------------
-- Derived aggregates: ledger trigger.
--
-- Inserting a gold_xp_ledger row atomically updates the bound adventurer's
-- gold_balance / xp_total / achievement_points and recomputes level. Because
-- trigger and insert share one transaction:
--   * rapid taps that double-award/double-spend serialize on the profile row
--     (row-level lock on UPDATE), and
--   * an overdraw violates the gold_balance >= 0 check, rolling back the
--     ledger insert with it — no negative balances, ever.
-- The function is SECURITY DEFINER so it can write the derived columns that
-- client roles cannot.
-- ---------------------------------------------------------------------------

-- Level curve: level = floor(sqrt(xp / 100)) + 1 (level 1 at 0 XP, 2 at 100,
-- 3 at 400, 4 at 900, ...). MUST stay in sync with lib/game-math.ts.
create or replace function public.level_for_xp(p_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select floor(sqrt(greatest(p_xp, 0) / 100.0))::integer + 1;
$$;

create or replace function public.apply_gold_xp_ledger_entry()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.adventurer_profiles
  set
    gold_balance = gold_balance + new.delta_gold,
    xp_total = xp_total + new.delta_xp,
    achievement_points = achievement_points + new.delta_achievement_points,
    level = public.level_for_xp(xp_total + new.delta_xp)
  where id = new.adventurer_id;

  if not found then
    raise exception 'gold_xp_ledger: adventurer % not found', new.adventurer_id;
  end if;

  return new;
end;
$$;

create trigger gold_xp_ledger_apply
  after insert on public.gold_xp_ledger
  for each row
  execute function public.apply_gold_xp_ledger_entry();

-- ---------------------------------------------------------------------------
-- Grants. RLS does row filtering; grants set the ceiling per role.
-- Column-level UPDATE grants enforce "client code never updates derived
-- columns directly":
--   * adventurer_profiles: derived columns excluded from the grant.
--   * guilds: subscription_entitlement excluded — only the RevenueCat webhook
--     (service role) may change it.
-- gold_xp_ledger gets INSERT + SELECT only (append-only audit trail).
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.npc_profiles to authenticated;
grant select, insert, update, delete on public.quests to authenticated;
grant select, insert, update, delete on public.quest_completions to authenticated;
grant select, insert, update, delete on public.loot_items to authenticated;
grant select, insert, update, delete on public.loot_redemptions to authenticated;
grant select, insert, update, delete on public.loot_wishlist to authenticated;
grant select, insert, update, delete on public.adventurer_cosmetics to authenticated;
grant select, insert, update, delete on public.pairing_codes to authenticated;
grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert on public.consent_events to authenticated;
grant select on public.cosmetic_items to authenticated;
grant select, insert on public.gold_xp_ledger to authenticated;

grant select, insert, delete on public.guilds to authenticated;
grant update (name, crest, owner_npc_id) on public.guilds to authenticated;

grant select, insert, delete on public.adventurer_profiles to authenticated;
grant update (
  nickname, age_bucket, avatar_config, theme_id, variant_id,
  current_streak_days, longest_streak_days
) on public.adventurer_profiles to authenticated;

grant select, update on public.device_bindings to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: guild-level channels subscribe to these tables.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.guilds;
alter publication supabase_realtime add table public.adventurer_profiles;
alter publication supabase_realtime add table public.quests;
alter publication supabase_realtime add table public.quest_completions;
alter publication supabase_realtime add table public.loot_items;
alter publication supabase_realtime add table public.loot_redemptions;
alter publication supabase_realtime add table public.loot_wishlist;
alter publication supabase_realtime add table public.adventurer_cosmetics;
