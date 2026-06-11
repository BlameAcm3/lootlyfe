-- RLS for the guild-domain schema (006).
--
-- Two client identities exist:
--   * NPC: a real Supabase Auth user with an npc_profiles row. Full
--     guild-scoped access.
--   * Adventurer device: an ANONYMOUS auth user whose auth.uid() has an
--     unrevoked device_bindings row (written only by the pair-device Edge
--     Function). Read access to its own profile and its guild's shared
--     content; insert access to its own completions/redemptions/wishlist.
--     Explicitly NO access to other adventurers' data, consent_events, or
--     notification_preferences.
--
-- Helper functions are SECURITY DEFINER so policy checks on npc_profiles and
-- device_bindings don't recurse into those tables' own policies.

create or replace function public.is_guild_npc(p_guild_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.npc_profiles
    where guild_id = p_guild_id
      and user_id = (select auth.uid())
  );
$$;

-- The caller's bound adventurer (null when the caller is not a paired,
-- unrevoked kid device).
create or replace function public.bound_adventurer_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select adventurer_id
  from public.device_bindings
  where user_id = (select auth.uid())
    and revoked_at is null
  limit 1;
$$;

create or replace function public.bound_guild_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select guild_id
  from public.device_bindings
  where user_id = (select auth.uid())
    and revoked_at is null
  limit 1;
$$;

-- Guild of an adventurer; used for NPC policies on tables that carry only
-- adventurer_id (completions, redemptions, wishlist, cosmetics, ledger).
create or replace function public.adventurer_guild_id(p_adventurer_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select guild_id from public.adventurer_profiles where id = p_adventurer_id;
$$;

-- True when the caller is a full (non-anonymous) auth user. Blocks paired kid
-- devices (anonymous sessions) from creating guilds/NPC profiles.
create or replace function public.is_full_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    and (select auth.uid()) is not null;
$$;

grant execute on function public.is_guild_npc(uuid) to authenticated;
grant execute on function public.bound_adventurer_id() to authenticated;
grant execute on function public.bound_guild_id() to authenticated;
grant execute on function public.adventurer_guild_id(uuid) to authenticated;
grant execute on function public.is_full_user() to authenticated;
grant execute on function public.level_for_xp(integer) to authenticated;

alter table public.guilds enable row level security;
alter table public.npc_profiles enable row level security;
alter table public.adventurer_profiles enable row level security;
alter table public.device_bindings enable row level security;
alter table public.pairing_codes enable row level security;
alter table public.quests enable row level security;
alter table public.quest_completions enable row level security;
alter table public.loot_items enable row level security;
alter table public.loot_redemptions enable row level security;
alter table public.loot_wishlist enable row level security;
alter table public.cosmetic_items enable row level security;
alter table public.adventurer_cosmetics enable row level security;
alter table public.gold_xp_ledger enable row level security;
alter table public.consent_events enable row level security;
alter table public.notification_preferences enable row level security;

-- ===========================================================================
-- guilds
-- ===========================================================================

-- TEST INTENT: an NPC sees only guilds where they hold an npc_profiles row;
-- a stranger (or unpaired anon user) sees zero guilds.
create policy guilds_npc_select on public.guilds
  for select to authenticated
  using (public.is_guild_npc(id));

-- TEST INTENT: a paired kid device can read its own guild row (needed for the
-- guild name and subscription_entitlement → theme availability gating), and
-- no other guild.
create policy guilds_adventurer_select on public.guilds
  for select to authenticated
  using (id = public.bound_guild_id());

-- TEST INTENT: any full (non-anonymous) signed-in user may create a guild;
-- an anonymous (kid device) session may not.
create policy guilds_insert on public.guilds
  for insert to authenticated
  with check (public.is_full_user());

-- TEST INTENT: guild NPCs can rename / re-crest / transfer owner reference;
-- they CANNOT change subscription_entitlement (no column grant — only the
-- RevenueCat webhook via service role can).
create policy guilds_npc_update on public.guilds
  for update to authenticated
  using (public.is_guild_npc(id))
  with check (public.is_guild_npc(id));

-- TEST INTENT: only the guild's owner-role NPC can delete the guild; admins
-- cannot.
create policy guilds_owner_delete on public.guilds
  for delete to authenticated
  using (
    exists (
      select 1 from public.npc_profiles
      where guild_id = guilds.id
        and user_id = (select auth.uid())
        and role = 'owner'
    )
  );

-- ===========================================================================
-- npc_profiles
-- ===========================================================================

-- TEST INTENT: NPCs see co-NPCs of their own guilds only; adventurer devices
-- see no NPC profiles at all.
create policy npc_profiles_select on public.npc_profiles
  for select to authenticated
  using (public.is_guild_npc(guild_id));

-- TEST INTENT: a full user can create their OWN npc_profile row (guild
-- creation / invite acceptance); they cannot insert a profile for another
-- user_id, and anonymous sessions cannot insert at all.
create policy npc_profiles_insert on public.npc_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_full_user());

-- TEST INTENT: an NPC can edit only their own profile (display name, avatar).
create policy npc_profiles_update on public.npc_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- TEST INTENT: an NPC can remove only their own membership (leave guild).
-- Owner removal/transfer rules are enforced at the application/Edge level.
create policy npc_profiles_delete on public.npc_profiles
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ===========================================================================
-- adventurer_profiles
-- ===========================================================================

-- TEST INTENT: NPCs have full CRUD on adventurers in their guilds. The
-- derived columns (gold_balance, xp_total, level, achievement_points) are
-- excluded from the UPDATE column grant in 006, so even guild NPCs cannot
-- set them directly — only ledger inserts move them.
create policy adventurer_profiles_npc_select on public.adventurer_profiles
  for select to authenticated
  using (public.is_guild_npc(guild_id));

create policy adventurer_profiles_npc_insert on public.adventurer_profiles
  for insert to authenticated
  with check (public.is_guild_npc(guild_id));

create policy adventurer_profiles_npc_update on public.adventurer_profiles
  for update to authenticated
  using (public.is_guild_npc(guild_id))
  with check (public.is_guild_npc(guild_id));

create policy adventurer_profiles_npc_delete on public.adventurer_profiles
  for delete to authenticated
  using (public.is_guild_npc(guild_id));

-- TEST INTENT: a paired kid device reads ONLY its own adventurer profile —
-- not siblings in the same guild. (No update: theme/avatar changes from the
-- kid device arrive in a later pass, likely via a narrow policy or RPC.)
create policy adventurer_profiles_device_select on public.adventurer_profiles
  for select to authenticated
  using (id = public.bound_adventurer_id());

-- ===========================================================================
-- device_bindings
-- ===========================================================================

-- TEST INTENT: NPCs see all bindings in their guilds (revocation dashboard).
create policy device_bindings_npc_select on public.device_bindings
  for select to authenticated
  using (public.is_guild_npc(guild_id));

-- TEST INTENT: NPCs can update bindings in their guilds (set revoked_at).
create policy device_bindings_npc_update on public.device_bindings
  for update to authenticated
  using (public.is_guild_npc(guild_id))
  with check (public.is_guild_npc(guild_id));

-- TEST INTENT: a device reads its own binding row (to discover its bound
-- adventurer_id after pairing), including a revoked one (so the app can show
-- "this device was unpaired"). No client INSERT policy exists on this table —
-- only the pair-device Edge Function (service role) creates bindings.
create policy device_bindings_own_select on public.device_bindings
  for select to authenticated
  using (user_id = (select auth.uid()));

-- ===========================================================================
-- pairing_codes — NPC-only, per spec.
-- ===========================================================================

-- TEST INTENT: NPCs manage pairing codes for their own guilds only. Kid
-- devices and strangers can neither read nor mint codes; the pair-device
-- Edge Function reads/consumes codes via service role, bypassing RLS.
create policy pairing_codes_npc_select on public.pairing_codes
  for select to authenticated
  using (public.is_guild_npc(guild_id));

create policy pairing_codes_npc_insert on public.pairing_codes
  for insert to authenticated
  with check (
    public.is_guild_npc(guild_id)
    and public.adventurer_guild_id(adventurer_id) = guild_id
  );

create policy pairing_codes_npc_update on public.pairing_codes
  for update to authenticated
  using (public.is_guild_npc(guild_id))
  with check (public.is_guild_npc(guild_id));

create policy pairing_codes_npc_delete on public.pairing_codes
  for delete to authenticated
  using (public.is_guild_npc(guild_id));

-- ===========================================================================
-- quests
-- ===========================================================================

-- TEST INTENT: NPCs have full CRUD on their guilds' quests.
create policy quests_npc_all on public.quests
  for all to authenticated
  using (public.is_guild_npc(guild_id))
  with check (public.is_guild_npc(guild_id));

-- TEST INTENT: a paired kid device reads its guild's quest library (the quest
-- log needs titles/rewards), and nothing from other guilds.
create policy quests_device_select on public.quests
  for select to authenticated
  using (guild_id = public.bound_guild_id());

-- ===========================================================================
-- quest_completions
-- ===========================================================================

-- TEST INTENT: NPCs read/approve/reject completions for adventurers in their
-- guilds (status, approved_at, approved_by_npc_id changes happen here).
create policy quest_completions_npc_all on public.quest_completions
  for all to authenticated
  using (public.is_guild_npc(public.adventurer_guild_id(adventurer_id)))
  with check (public.is_guild_npc(public.adventurer_guild_id(adventurer_id)));

-- TEST INTENT: a kid device can submit a completion ONLY for its own bound
-- adventurer, ONLY in pending state with no approval fields pre-set (no
-- self-approval), and ONLY for a quest belonging to its own guild.
create policy quest_completions_device_insert on public.quest_completions
  for insert to authenticated
  with check (
    adventurer_id = public.bound_adventurer_id()
    and status = 'pending'
    and approved_at is null
    and approved_by_npc_id is null
    and exists (
      select 1 from public.quests q
      where q.id = quest_id and q.guild_id = public.bound_guild_id()
    )
  );

-- TEST INTENT: a kid device sees its own completion history (quest log),
-- never a sibling's.
create policy quest_completions_device_select on public.quest_completions
  for select to authenticated
  using (adventurer_id = public.bound_adventurer_id());

-- ===========================================================================
-- loot_items
-- ===========================================================================

-- TEST INTENT: NPCs have full CRUD on their guilds' loot.
create policy loot_items_npc_all on public.loot_items
  for all to authenticated
  using (public.is_guild_npc(guild_id))
  with check (public.is_guild_npc(guild_id));

-- TEST INTENT: a paired kid device browses its guild's loot shop, read-only.
create policy loot_items_device_select on public.loot_items
  for select to authenticated
  using (guild_id = public.bound_guild_id());

-- ===========================================================================
-- loot_redemptions
-- ===========================================================================

-- TEST INTENT: NPCs read/approve/reject redemptions in their guilds.
create policy loot_redemptions_npc_all on public.loot_redemptions
  for all to authenticated
  using (public.is_guild_npc(public.adventurer_guild_id(adventurer_id)))
  with check (public.is_guild_npc(public.adventurer_guild_id(adventurer_id)));

-- TEST INTENT: a kid device requests a redemption ONLY for itself, ONLY
-- pending/unapproved, ONLY for loot in its own guild. (Gold is deducted via
-- the ledger on NPC approval, not at request time.)
create policy loot_redemptions_device_insert on public.loot_redemptions
  for insert to authenticated
  with check (
    adventurer_id = public.bound_adventurer_id()
    and status = 'pending'
    and approved_at is null
    and approved_by_npc_id is null
    and exists (
      select 1 from public.loot_items li
      where li.id = loot_id and li.guild_id = public.bound_guild_id()
    )
  );

-- TEST INTENT: a kid device sees its own redemption history only.
create policy loot_redemptions_device_select on public.loot_redemptions
  for select to authenticated
  using (adventurer_id = public.bound_adventurer_id());

-- ===========================================================================
-- loot_wishlist
-- ===========================================================================

-- TEST INTENT: NPCs read and resolve (accept/decline) wishlist items from
-- adventurers in their guilds.
create policy loot_wishlist_npc_all on public.loot_wishlist
  for all to authenticated
  using (public.is_guild_npc(public.adventurer_guild_id(adventurer_id)))
  with check (public.is_guild_npc(public.adventurer_guild_id(adventurer_id)));

-- TEST INTENT: a kid device proposes wishes for itself only, starting as
-- 'proposed' (the NPC flips status later).
create policy loot_wishlist_device_insert on public.loot_wishlist
  for insert to authenticated
  with check (
    adventurer_id = public.bound_adventurer_id()
    and status = 'proposed'
  );

-- TEST INTENT: a kid device sees its own wish list only.
create policy loot_wishlist_device_select on public.loot_wishlist
  for select to authenticated
  using (adventurer_id = public.bound_adventurer_id());

-- ===========================================================================
-- cosmetic_items — global read-only catalog.
-- ===========================================================================

-- TEST INTENT: every authenticated identity (NPC or paired device) can browse
-- the cosmetic catalog; nobody can write it from the client (no insert/
-- update/delete policies and no grants beyond SELECT in 006).
create policy cosmetic_items_select on public.cosmetic_items
  for select to authenticated
  using (true);

-- ===========================================================================
-- adventurer_cosmetics
-- ===========================================================================

-- TEST INTENT: NPCs manage unlocks/equips for adventurers in their guilds.
-- (Kid-driven cosmetic purchase — unlock + achievement-point ledger entry in
-- one transaction — arrives later as an RPC/Edge Function.)
create policy adventurer_cosmetics_npc_all on public.adventurer_cosmetics
  for all to authenticated
  using (public.is_guild_npc(public.adventurer_guild_id(adventurer_id)))
  with check (public.is_guild_npc(public.adventurer_guild_id(adventurer_id)));

-- TEST INTENT: a kid device sees its own unlocked cosmetics (inventory/avatar
-- screens), read-only, never a sibling's.
create policy adventurer_cosmetics_device_select on public.adventurer_cosmetics
  for select to authenticated
  using (adventurer_id = public.bound_adventurer_id());

-- ===========================================================================
-- gold_xp_ledger — append-only.
-- ===========================================================================

-- TEST INTENT: NPCs read the audit trail for their guilds' adventurers and
-- append entries (quest approval awards, redemption deductions, manual
-- adjustments). No UPDATE/DELETE policy or grant exists for anyone: history
-- is immutable. The trigger keeps profile aggregates in sync atomically.
create policy gold_xp_ledger_npc_select on public.gold_xp_ledger
  for select to authenticated
  using (public.is_guild_npc(public.adventurer_guild_id(adventurer_id)));

create policy gold_xp_ledger_npc_insert on public.gold_xp_ledger
  for insert to authenticated
  with check (public.is_guild_npc(public.adventurer_guild_id(adventurer_id)));

-- ===========================================================================
-- consent_events — NPC-only, per spec (kid devices have NO access).
-- ===========================================================================

-- TEST INTENT: NPCs read and append consent events for their own guilds.
-- Append-only (no update/delete policies or grants): consent history is an
-- immutable record. pair-device inserts via service role.
create policy consent_events_npc_select on public.consent_events
  for select to authenticated
  using (public.is_guild_npc(guild_id));

create policy consent_events_npc_insert on public.consent_events
  for insert to authenticated
  with check (public.is_guild_npc(guild_id));

-- ===========================================================================
-- notification_preferences — per-NPC, per spec (kid devices have NO access).
-- ===========================================================================

-- TEST INTENT: an NPC manages ONLY their own notification preferences — not
-- a co-parent's, and kid devices see nothing.
create policy notification_preferences_own_all on public.notification_preferences
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
