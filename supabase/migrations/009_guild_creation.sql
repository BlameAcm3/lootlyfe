-- Guild creation RPC + adventurer archiving.

-- Soft-archive for adventurer management (list/add/edit/archive). Archived
-- adventurers keep their history; the UI filters on archived_at.
alter table public.adventurer_profiles
  add column archived_at timestamptz;

-- ---------------------------------------------------------------------------
-- create_guild: guild + owner npc_profile + parental consent event in ONE
-- transaction. SECURITY INVOKER — runs as the caller, so every insert/update
-- is still checked by the RLS policies from 007:
--   * guilds insert requires a full (non-anonymous) user,
--   * npc_profiles insert requires user_id = auth.uid(),
--   * consent_events insert requires guild membership (true once the owner
--     profile row exists).
-- The consent event records the sign-up checkbox (method 'signup_checkbox');
-- it is written here because consent_events needs guild_id + npc_id, which
-- don't exist until guild creation.
-- ---------------------------------------------------------------------------
create or replace function public.create_guild(
  p_name text,
  p_crest text,
  p_display_name text,
  p_consent_method text default 'signup_checkbox'
)
returns uuid
language plpgsql
as $$
declare
  -- Ids are pre-generated instead of using INSERT ... RETURNING: RETURNING
  -- rows must pass the table's SELECT policies, and a brand-new guild is not
  -- visible to its creator until the owner npc_profiles row exists.
  v_guild_id uuid := gen_random_uuid();
  v_npc_id uuid := gen_random_uuid();
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'guild name is required';
  end if;

  insert into public.guilds (id, name, crest)
  values (v_guild_id, trim(p_name), p_crest);

  insert into public.npc_profiles (id, user_id, guild_id, role, display_name)
  values (v_npc_id, auth.uid(), v_guild_id, 'owner', coalesce(nullif(trim(p_display_name), ''), 'Guild Master'));

  update public.guilds set owner_npc_id = v_npc_id where id = v_guild_id;

  insert into public.consent_events (guild_id, npc_id, type, method)
  values (v_guild_id, v_npc_id, 'parental_consent', p_consent_method);

  return v_guild_id;
end;
$$;

grant execute on function public.create_guild(text, text, text, text) to authenticated;
