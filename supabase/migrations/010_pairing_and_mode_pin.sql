-- Device pairing helpers + single-device mode-toggle PIN.

-- 4-digit mode-toggle PIN, bcrypt-hashed server-side. Only the hash is ever
-- stored or transported; verification happens in verify_mode_pin.
alter table public.npc_profiles
  add column pin_hash text;

-- ---------------------------------------------------------------------------
-- create_pairing_code(adventurer): mints a 6-digit code valid 10 minutes and
-- retires any previous unconsumed codes for that adventurer (one live code
-- per adventurer). SECURITY INVOKER: the pairing_codes RLS policies enforce
-- that only a guild NPC can mint codes for their own guild's adventurers.
-- Codes come from pgcrypto's CSPRNG (gen_random_bytes), not random().
-- ---------------------------------------------------------------------------
create or replace function public.create_pairing_code(p_adventurer_id uuid)
returns table (code text, expires_at timestamptz)
language plpgsql
set search_path = public, extensions
as $$
declare
  v_guild_id uuid;
  v_npc_id uuid;
  v_code text;
  v_expires timestamptz := now() + interval '10 minutes';
begin
  select guild_id into v_guild_id from public.adventurer_profiles where id = p_adventurer_id;
  if v_guild_id is null then
    raise exception 'adventurer not found';
  end if;

  select id into v_npc_id
  from public.npc_profiles
  where user_id = auth.uid() and guild_id = v_guild_id;
  if v_npc_id is null then
    raise exception 'not a member of this guild';
  end if;

  -- One live code per adventurer: retire previous unconsumed codes.
  update public.pairing_codes
  set consumed_at = now()
  where adventurer_id = p_adventurer_id and consumed_at is null;

  v_code := lpad(
    (abs(('x' || encode(gen_random_bytes(4), 'hex'))::bit(32)::int) % 1000000)::text,
    6,
    '0'
  );

  insert into public.pairing_codes (guild_id, adventurer_id, code, expires_at, created_by_npc_id)
  values (v_guild_id, p_adventurer_id, v_code, v_expires, v_npc_id);

  return query select v_code, v_expires;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_mode_pin / verify_mode_pin: single-device mode-toggle PIN on the
-- caller's own npc_profiles rows. bcrypt via pgcrypto crypt().
-- NOTE: a 4-digit PIN is a child-deterrent, not an auth boundary; the NPC is
-- already authenticated and the PIN only gates the in-app mode switch.
-- ---------------------------------------------------------------------------
create or replace function public.set_mode_pin(p_pin text)
returns void
language plpgsql
set search_path = public, extensions
as $$
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'pin must be exactly 4 digits';
  end if;

  update public.npc_profiles
  set pin_hash = crypt(p_pin, gen_salt('bf'))
  where user_id = auth.uid();

  if not found then
    raise exception 'no npc profile for caller';
  end if;
end;
$$;

create or replace function public.verify_mode_pin(p_pin text)
returns boolean
language sql
stable
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.npc_profiles
    where user_id = auth.uid()
      and pin_hash is not null
      and pin_hash = crypt(p_pin, pin_hash)
  );
$$;

-- ---------------------------------------------------------------------------
-- touch_device_binding: heartbeat from a paired kid device (on app
-- foreground). SECURITY DEFINER because devices intentionally have no UPDATE
-- policy on device_bindings; the function only touches the caller's own
-- unrevoked rows. Returns false when no active binding remains; the client
-- uses that as the revocation signal.
-- ---------------------------------------------------------------------------
create or replace function public.touch_device_binding()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.device_bindings
  set last_seen_at = now()
  where user_id = (select auth.uid())
    and revoked_at is null;
  return found;
end;
$$;

grant execute on function public.create_pairing_code(uuid) to authenticated;
grant execute on function public.set_mode_pin(text) to authenticated;
grant execute on function public.verify_mode_pin(text) to authenticated;
grant execute on function public.touch_device_binding() to authenticated;
