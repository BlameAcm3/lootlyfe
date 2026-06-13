-- Achievement economy acceptance (migration 014). Run against local dev:
--   docker exec -i supabase_db_lootlyfe psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/snippets/acceptance_achievement_economy.sql
-- Everything runs inside one transaction and ROLLS BACK — no data persists.
--
-- Kid-device RPC calls are simulated by switching role to `authenticated`
-- with the anon user's JWT claims via set_config, exactly what PostgREST does.

begin;

do $$
declare
  v_guild uuid;
  v_other_guild uuid;
  v_adv uuid;
  v_other_adv uuid;
  v_anon_user uuid := gen_random_uuid();
  v_npc_user uuid := gen_random_uuid();
  v_npc uuid;
  v_q_required uuid;
  v_q_epic uuid;
  v_q_bonus uuid;
  v_c uuid;
  v_loot uuid;
  v_today date := (now() at time zone 'utc')::date;
  v_count integer;
  v_pts integer;
  v_pts_before integer;
  v_status text;
  v_item_charm uuid;
  v_item_guard uuid;
  v_item_starter uuid;
  v_item_premium uuid;
  v_cfg jsonb;
begin
  -- ----- fixtures (as postgres: RLS bypassed; we are testing triggers/RPCs) -----
  insert into public.guilds (name) values ('Achievement Guild') returning id into v_guild;
  insert into public.guilds (name) values ('Other Guild') returning id into v_other_guild;
  insert into public.adventurer_profiles (guild_id, nickname, age_bucket)
    values (v_guild, 'Test Kid', '9-12') returning id into v_adv;
  insert into public.adventurer_profiles (guild_id, nickname, age_bucket)
    values (v_other_guild, 'Other Kid', '5-8') returning id into v_other_adv;

  insert into auth.users (id, instance_id, aud, role, is_anonymous)
    values (v_anon_user, '00000000-0000-0000-0000-000000000000',
            'authenticated', 'authenticated', true);
  insert into auth.users (id, instance_id, aud, role, email, is_anonymous)
    values (v_npc_user, '00000000-0000-0000-0000-000000000000',
            'authenticated', 'authenticated', 'npc-acceptance@test.local', false);
  insert into public.npc_profiles (user_id, guild_id, role, display_name)
    values (v_npc_user, v_guild, 'owner', 'Test Parent') returning id into v_npc;
  insert into public.device_bindings (user_id, adventurer_id, guild_id)
    values (v_anon_user, v_adv, v_guild);

  insert into public.quests (guild_id, title, category, xp_reward, gold_reward,
      is_required, requires_approval, recurrence, assigned_adventurer_ids)
    values (v_guild, 'Required daily', 'chores', 10, 5, true, false,
      jsonb_build_object('type', 'daily', 'startDate', to_char(v_today - 10, 'YYYY-MM-DD')),
      array[v_adv])
    returning id into v_q_required;
  insert into public.quests (guild_id, title, category, xp_reward, gold_reward,
      is_required, requires_approval, recurrence, assigned_adventurer_ids)
    values (v_guild, 'Epic study', 'school', 5000, 0, false, false,
      jsonb_build_object('type', 'daily', 'startDate', to_char(v_today - 10, 'YYYY-MM-DD')),
      array[v_adv])
    returning id into v_q_epic;
  insert into public.quests (guild_id, title, category, xp_reward, gold_reward,
      is_required, requires_approval, recurrence, assigned_adventurer_ids)
    values (v_guild, 'Bonus stretch', 'exercise', 5, 5, false, false,
      jsonb_build_object('type', 'daily', 'startDate', to_char(v_today - 10, 'YYYY-MM-DD')),
      array[v_adv])
    returning id into v_q_bonus;

  select id into v_item_charm   from public.cosmetic_items where item_key = 'acc-charm';
  select id into v_item_guard   from public.cosmetic_items where item_key = 'head-guard';
  select id into v_item_starter from public.cosmetic_items where item_key = 'head-starter';
  select id into v_item_premium from public.cosmetic_items where item_key = 'acc-mythic';

  -- ----- 1. first completion → first-quest awarded, exactly one ledger grant -----
  insert into public.quest_completions (quest_id, adventurer_id, due_date)
    values (v_q_required, v_adv, v_today) returning id into v_c;
  select count(*) into v_count from public.adventurer_achievements
    where adventurer_id = v_adv and achievement_id = 'first-quest';
  if v_count <> 1 then raise exception 'FAIL first-quest award count=%', v_count; end if;
  select count(*) into v_count from public.gold_xp_ledger
    where adventurer_id = v_adv and source_type = 'achievement';
  if v_count <> 1 then raise exception 'FAIL achievement ledger rows=%', v_count; end if;
  select achievement_points into v_pts from public.adventurer_profiles where id = v_adv;
  if v_pts <> 10 then raise exception 'FAIL points after first-quest=% (want 10)', v_pts; end if;
  raise notice 'PASS 1: first-quest awarded once, +10 points via ledger';

  -- ----- 2. level milestones awarded from the same grant transaction -----
  insert into public.quest_completions (quest_id, adventurer_id, due_date)
    values (v_q_epic, v_adv, v_today);
  -- 5000 xp → level 16: level-5 and level-10 earned, level-25 not.
  select count(*) into v_count from public.adventurer_achievements
    where adventurer_id = v_adv and achievement_id in ('level-5', 'level-10');
  if v_count <> 2 then raise exception 'FAIL level milestones=%', v_count; end if;
  select count(*) into v_count from public.adventurer_achievements
    where adventurer_id = v_adv and achievement_id = 'level-25';
  if v_count <> 0 then raise exception 'FAIL level-25 awarded early'; end if;
  raise notice 'PASS 2: level-5 and level-10 awarded with the level-up grant';

  -- ----- 3. replay/re-evaluation never double-awards -----
  update public.quest_completions set status = 'approved' where id = v_c;
  select count(*) into v_count from public.adventurer_achievements
    where adventurer_id = v_adv and achievement_id = 'first-quest';
  if v_count <> 1 then raise exception 'FAIL replay duplicated award'; end if;
  select count(*) into v_count from public.gold_xp_ledger
    where adventurer_id = v_adv and source_type = 'achievement'
      and delta_achievement_points = 10;
  if v_count <> 1 then raise exception 'FAIL replay duplicated points'; end if;
  raise notice 'PASS 3: award + points grant idempotent across re-evaluation';

  -- ----- 4. perfect week + streak achievements -----
  for i in reverse 6..1 loop
    insert into public.quest_completions
        (quest_id, adventurer_id, status, approved_at, completed_at, due_date)
      values (v_q_required, v_adv, 'approved', now(), now() - make_interval(days => i),
              v_today - i);
  end loop;
  -- A fresh today-grant re-evaluates with as_of = today: 7-day window complete.
  insert into public.quest_completions (quest_id, adventurer_id, due_date)
    values (v_q_bonus, v_adv, v_today);
  select count(*) into v_count from public.adventurer_achievements
    where adventurer_id = v_adv
      and achievement_id in ('streak-3', 'streak-7', 'required-week');
  if v_count <> 3 then raise exception 'FAIL week/streak awards=% (want 3)', v_count; end if;
  select count(*) into v_count from public.adventurer_achievements
    where adventurer_id = v_adv and achievement_id = 'streak-14';
  if v_count <> 0 then raise exception 'FAIL streak-14 awarded early'; end if;
  raise notice 'PASS 4: streak-3, streak-7, required-week awarded after a perfect week';

  -- ----- 5. redemption approval awards first-redemption -----
  insert into public.loot_items (guild_id, name, gold_cost, created_by_npc_id)
    values (v_guild, 'Movie night', 50, v_npc) returning id into v_loot;
  insert into public.loot_redemptions (loot_id, adventurer_id, status, gold_spent)
    values (v_loot, v_adv, 'pending', 50);
  update public.loot_redemptions set status = 'approved', approved_at = now()
    where adventurer_id = v_adv;
  select count(*) into v_count from public.adventurer_achievements
    where adventurer_id = v_adv and achievement_id = 'first-redemption';
  if v_count <> 1 then raise exception 'FAIL first-redemption=%', v_count; end if;
  raise notice 'PASS 5: redemption approval path awards first-redemption';

  -- ----- 6. purchase as the kid device: starter free, paid debits once -----
  -- Pin the balance to a known value for the spending tests.
  select achievement_points into v_pts from public.adventurer_profiles where id = v_adv;
  insert into public.gold_xp_ledger
      (adventurer_id, delta_achievement_points, source_type)
    values (v_adv, 50 - v_pts, 'manual_adjustment');

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_anon_user, 'role', 'authenticated',
                      'is_anonymous', true)::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*) into v_count from public.achievements;
  if v_count <> 17 then raise exception 'FAIL kid catalog visibility=%', v_count; end if;

  select public.purchase_cosmetic(v_adv, v_item_starter) into v_status;
  if v_status <> 'purchased' then raise exception 'FAIL starter: %', v_status; end if;
  select public.purchase_cosmetic(v_adv, v_item_charm) into v_status;
  if v_status <> 'purchased' then raise exception 'FAIL charm: %', v_status; end if;

  perform set_config('role', 'postgres', true);
  select achievement_points into v_pts from public.adventurer_profiles where id = v_adv;
  if v_pts <> 20 then raise exception 'FAIL balance after buys=% (want 50-30=20)', v_pts; end if;
  select count(*) into v_count from public.gold_xp_ledger
    where adventurer_id = v_adv and source_type = 'cosmetic_purchase';
  if v_count <> 1 then raise exception 'FAIL purchase ledger rows=% (starter is free)', v_count; end if;
  raise notice 'PASS 6: starter unlocks free, paid item debits 30 exactly once';

  -- ----- 7. rapid double-tap: second purchase is already_owned, no second debit -----
  perform set_config('role', 'authenticated', true);
  select public.purchase_cosmetic(v_adv, v_item_charm) into v_status;
  if v_status <> 'already_owned' then raise exception 'FAIL double-tap: %', v_status; end if;
  perform set_config('role', 'postgres', true);
  select achievement_points into v_pts from public.adventurer_profiles where id = v_adv;
  if v_pts <> 20 then raise exception 'FAIL double-tap debited again: %', v_pts; end if;
  raise notice 'PASS 7: double-tap collapses to already_owned, balance untouched';

  -- ----- 8. overdraw: atomic rollback, no unlock, no negative balance -----
  perform set_config('role', 'authenticated', true);
  select public.purchase_cosmetic(v_adv, v_item_guard) into v_status; -- costs 40 > 20
  if v_status <> 'insufficient_points' then raise exception 'FAIL overdraw: %', v_status; end if;
  perform set_config('role', 'postgres', true);
  select achievement_points into v_pts from public.adventurer_profiles where id = v_adv;
  if v_pts <> 20 then raise exception 'FAIL overdraw changed balance: %', v_pts; end if;
  select count(*) into v_count from public.adventurer_cosmetics ac
    where ac.adventurer_id = v_adv and ac.cosmetic_id = v_item_guard;
  if v_count <> 0 then raise exception 'FAIL overdraw left an unlock row'; end if;
  raise notice 'PASS 8: overdraw rejected atomically (no unlock, balance intact)';

  -- ----- 9. premium gate: server-side, lifts when the guild upgrades -----
  perform set_config('role', 'authenticated', true);
  select public.purchase_cosmetic(v_adv, v_item_premium) into v_status;
  if v_status <> 'premium_required' then raise exception 'FAIL premium gate: %', v_status; end if;
  perform set_config('role', 'postgres', true);
  update public.guilds set subscription_entitlement = 'premium' where id = v_guild;
  insert into public.gold_xp_ledger (adventurer_id, delta_achievement_points, source_type)
    values (v_adv, 100, 'manual_adjustment');
  perform set_config('role', 'authenticated', true);
  select public.purchase_cosmetic(v_adv, v_item_premium) into v_status;
  if v_status <> 'purchased' then raise exception 'FAIL premium after upgrade: %', v_status; end if;
  raise notice 'PASS 9: premium_only blocked on free guild, allowed after upgrade';

  -- ----- 10. equip/unequip keeps flags and avatar_config in sync -----
  perform public.set_equipped_cosmetic(v_adv, v_item_charm, true);
  perform public.set_equipped_cosmetic(v_adv, v_item_starter, true);
  perform public.set_avatar_base(v_adv, 2);
  perform set_config('role', 'postgres', true);
  select avatar_config into v_cfg from public.adventurer_profiles where id = v_adv;
  if v_cfg -> 'slots' ->> 'accessory' <> 'acc-charm'
     or v_cfg -> 'slots' ->> 'head' <> 'head-starter'
     or (v_cfg ->> 'base')::integer <> 2 then
    raise exception 'FAIL avatar_config=%', v_cfg;
  end if;
  select count(*) into v_count from public.adventurer_cosmetics
    where adventurer_id = v_adv and equipped;
  if v_count <> 2 then raise exception 'FAIL equipped flags=%', v_count; end if;
  perform set_config('role', 'authenticated', true);
  perform public.set_equipped_cosmetic(v_adv, v_item_charm, false);
  perform set_config('role', 'postgres', true);
  select avatar_config into v_cfg from public.adventurer_profiles where id = v_adv;
  if v_cfg -> 'slots' ? 'accessory' then
    raise exception 'FAIL unequip left slot: %', v_cfg;
  end if;
  raise notice 'PASS 10: equip swaps per slot, avatar_config mirrors equipped state';

  -- ----- 11. a kid device cannot act for another adventurer -----
  perform set_config('role', 'authenticated', true);
  begin
    perform public.purchase_cosmetic(v_other_adv, v_item_starter);
    raise exception 'FAIL: cross-adventurer purchase allowed';
  exception
    when raise_exception then
      if sqlerrm like 'FAIL%' then raise; end if;
  end;
  select count(*) into v_count from public.adventurer_achievements
    where adventurer_id <> v_adv;
  if v_count <> 0 then raise exception 'FAIL device sees foreign awards'; end if;
  perform set_config('role', 'postgres', true);
  raise notice 'PASS 11: cross-adventurer purchase rejected; RLS hides foreign awards';

  -- ----- 12. catalog parity with data/preset-achievements.ts -----
  select count(*) into v_count from public.achievements;
  if v_count <> 17 then raise exception 'FAIL achievement count=%', v_count; end if;
  select count(*) into v_count from public.cosmetic_items;
  if v_count <> 12 then raise exception 'FAIL cosmetic count=%', v_count; end if;
  select count(*) into v_count from public.cosmetic_items where achievement_point_cost = 0;
  if v_count <> 3 then raise exception 'FAIL starter count=%', v_count; end if;
  raise notice 'PASS 12: seeded catalogs match the client preset data';

  raise notice '=== ALL ACHIEVEMENT ECONOMY ACCEPTANCE CHECKS PASSED ===';
end;
$$;

rollback;
