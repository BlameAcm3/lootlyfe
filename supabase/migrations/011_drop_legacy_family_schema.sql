-- Drop the legacy family schema (001-005). The guild domain (006+) is the
-- only schema the app reads now; the legacy tables held pre-guild test data
-- and caused split-brain rosters (Home tab kids vs Guild tab adventurers).

-- The signup trigger wrote profiles rows; it must go before the table does or
-- every subsequent signup fails.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_auth_user();

-- Tables first (CASCADE removes their policies, triggers, indexes, and
-- realtime publication membership), then the now-orphaned functions.
drop table if exists
  public.push_tokens,
  public.streaks,
  public.reward_redemptions,
  public.rewards,
  public.points_transactions,
  public.chore_instances,
  public.chore_assignments,
  public.chores,
  public.kids,
  public.family_members,
  public.families,
  public.profiles
cascade;

drop function if exists public.award_points(uuid, uuid, integer, text, uuid, text);
drop function if exists public.redeem_reward(uuid, uuid);
drop function if exists public.prevent_points_transactions_mutation();
drop function if exists public.auto_verify_chore_instance();
drop function if exists public.on_chore_instance_verified();
drop function if exists public.is_family_member(uuid);
drop function if exists public.can_access_profile(uuid);
drop function if exists public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Replacement push-token registry, keyed directly to auth.users (the legacy
-- one hung off profiles). Every signed-in identity (NPC or paired device)
-- may register its own Expo push token; send-push reads via service role.
-- ---------------------------------------------------------------------------
create table public.device_push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null,
  platform text,
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

create index device_push_tokens_user_id_idx on public.device_push_tokens (user_id);

alter table public.device_push_tokens enable row level security;

-- TEST INTENT: an identity manages ONLY its own push tokens; nobody can read
-- or write another user's tokens from the client.
create policy device_push_tokens_own_all on public.device_push_tokens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.device_push_tokens to authenticated;
