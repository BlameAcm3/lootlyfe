-- Acceptance: server-side free-tier enforcement (migration 017) + delete_guild.
-- Rollback-wrapped — run against the LOCAL db, never remote:
--   docker exec -i supabase_db_lootlyfe psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/snippets/acceptance_premium_enforcement.sql
-- Every assertion RAISE NOTICE 'PASS ...'; an unexpected outcome aborts the txn.

begin;

-- Fixtures (fixed UUIDs so the asserts can reference them).
insert into auth.users (id, email) values
  ('22222222-2222-2222-2222-222222222222', 'enf-test@example.com');
insert into public.guilds (id, name, subscription_entitlement) values
  ('11111111-1111-1111-1111-111111111111', 'Enforce Test', 'free');
insert into public.npc_profiles (id, user_id, guild_id, role, display_name) values
  ('33333333-3333-3333-3333-333333333333',
   '22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111', 'owner', 'Owner');

-- 1. Adventurers: free guild caps at 2 active.
do $$
declare g uuid := '11111111-1111-1111-1111-111111111111';
begin
  insert into public.adventurer_profiles (guild_id, nickname, age_bucket) values (g, 'A1', '5-8');
  insert into public.adventurer_profiles (guild_id, nickname, age_bucket) values (g, 'A2', '5-8');
  begin
    insert into public.adventurer_profiles (guild_id, nickname, age_bucket) values (g, 'A3', '5-8');
    raise exception 'FAIL: 3rd adventurer allowed on free guild';
  exception when others then
    if sqlerrm <> 'adventurer_limit_reached' then raise exception 'FAIL: %', sqlerrm; end if;
    raise notice 'PASS: adventurer limit enforced (free)';
  end;
end $$;

-- 2. Premium guild: 3rd adventurer allowed.
do $$
declare g uuid := '11111111-1111-1111-1111-111111111111';
begin
  update public.guilds set subscription_entitlement = 'premium' where id = g;
  insert into public.adventurer_profiles (guild_id, nickname, age_bucket) values (g, 'A3', '5-8');
  raise notice 'PASS: 3rd adventurer allowed (premium)';
  update public.guilds set subscription_entitlement = 'free' where id = g;
end $$;

-- 3. Custom quests: free guild caps at 10; preset-sourced exempt.
do $$
declare g uuid := '11111111-1111-1111-1111-111111111111'; i int;
begin
  for i in 1..10 loop
    insert into public.quests (guild_id, title) values (g, 'Q' || i);
  end loop;
  begin
    insert into public.quests (guild_id, title) values (g, 'Q11');
    raise exception 'FAIL: 11th custom quest allowed on free guild';
  exception when others then
    if sqlerrm <> 'quest_limit_reached' then raise exception 'FAIL: %', sqlerrm; end if;
    raise notice 'PASS: custom quest limit enforced (free)';
  end;
  -- Preset-sourced quest bypasses the custom cap even at the limit.
  insert into public.quests (guild_id, title, source_preset_id) values (g, 'Preset', 'make_bed');
  raise notice 'PASS: preset-sourced quest exempt from limit';
end $$;

-- 4. Custom loot: free guild caps at 5.
do $$
declare g uuid := '11111111-1111-1111-1111-111111111111';
        n uuid := '33333333-3333-3333-3333-333333333333'; i int;
begin
  for i in 1..5 loop
    insert into public.loot_items (guild_id, name, gold_cost, created_by_npc_id)
      values (g, 'L' || i, 10, n);
  end loop;
  begin
    insert into public.loot_items (guild_id, name, gold_cost, created_by_npc_id)
      values (g, 'L6', 10, n);
    raise exception 'FAIL: 6th loot item allowed on free guild';
  exception when others then
    if sqlerrm <> 'loot_limit_reached' then raise exception 'FAIL: %', sqlerrm; end if;
    raise notice 'PASS: loot limit enforced (free)';
  end;
end $$;

-- 5. delete_guild: owner-only, cascades, RETAINS consent events.
do $$
declare g uuid := '11111111-1111-1111-1111-111111111111';
        n uuid := '33333333-3333-3333-3333-333333333333';
        v_retained int; v_guild_left int;
begin
  insert into public.consent_events (guild_id, npc_id, type, method)
    values (g, n, 'pairing', 'code');
  -- Impersonate the owner so auth.uid() resolves inside the SECURITY DEFINER fn.
  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
  perform public.delete_guild(g);

  select count(*) into v_guild_left from public.guilds where id = g;
  if v_guild_left <> 0 then raise exception 'FAIL: guild not deleted'; end if;
  raise notice 'PASS: guild deleted (cascade)';

  select count(*) into v_retained from private.retained_consent_events where guild_id = g;
  if v_retained < 1 then raise exception 'FAIL: consent events not retained'; end if;
  raise notice 'PASS: consent events retained (% row(s))', v_retained;
end $$;

-- 6. delete_guild rejects non-owners.
do $$
declare g2 uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
begin
  insert into public.guilds (id, name) values (g2, 'Other');
  perform set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
  begin
    perform public.delete_guild(g2); -- caller is not an NPC of g2
    raise exception 'FAIL: non-owner allowed to delete guild';
  exception when others then
    if sqlerrm <> 'not_guild_owner' then raise exception 'FAIL: %', sqlerrm; end if;
    raise notice 'PASS: delete_guild rejects non-owner';
  end;
end $$;

rollback;
