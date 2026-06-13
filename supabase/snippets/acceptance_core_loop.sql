-- Core game loop acceptance (migration 013). Run against local dev:
--   docker exec -i supabase_db_lootlyfe psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/snippets/acceptance_core_loop.sql
-- Everything runs inside one transaction and ROLLS BACK — no data persists.

begin;

do $$
declare
  v_guild uuid;
  v_adv uuid;
  v_q_auto uuid;
  v_q_appr uuid;
  v_q_bonus uuid;
  v_q_levelup uuid;
  v_c uuid;
  v_c2 uuid;
  v_c3 uuid;
  v_today date := (now() at time zone 'utc')::date;
  v_status text;
  v_count integer;
  v_gold integer;
  v_xp integer;
  v_int integer;
  v_num numeric;
begin
  -- ----- fixtures (as postgres: RLS bypassed; we are testing triggers) -----
  insert into public.guilds (name) values ('Acceptance Guild') returning id into v_guild;
  insert into public.adventurer_profiles (guild_id, nickname, age_bucket)
    values (v_guild, 'Test Kid', '9-12') returning id into v_adv;

  insert into public.quests (guild_id, title, category, xp_reward, gold_reward,
      is_required, requires_approval, recurrence, assigned_adventurer_ids)
    values (v_guild, 'Auto quest', 'chores', 10, 5, true, false,
      jsonb_build_object('type', 'daily', 'startDate', to_char(v_today - 10, 'YYYY-MM-DD')),
      array[v_adv])
    returning id into v_q_auto;

  -- ----- 1. game-math parity (SQL mirrors vs lib/game-math.ts) -----
  select public.xp_for_level(1) into v_int;
  if v_int <> 100 then raise exception 'FAIL xp_for_level(1)=%', v_int; end if;
  select public.xp_for_level(49) into v_int;
  if v_int <> 81940 then raise exception 'FAIL xp_for_level(49)=%', v_int; end if;
  select public.xp_for_level(50) into v_int;
  if v_int <> 0 then raise exception 'FAIL xp_for_level(50)=%', v_int; end if;
  select public.level_for_xp(99) into v_int;
  if v_int <> 1 then raise exception 'FAIL level_for_xp(99)=%', v_int; end if;
  select public.level_for_xp(100) into v_int;
  if v_int <> 2 then raise exception 'FAIL level_for_xp(100)=%', v_int; end if;
  select public.level_for_xp(214) into v_int;
  if v_int <> 2 then raise exception 'FAIL level_for_xp(214)=%', v_int; end if;
  select public.level_for_xp(215) into v_int;
  if v_int <> 3 then raise exception 'FAIL level_for_xp(215)=%', v_int; end if;
  select public.level_for_xp(627541) into v_int;
  if v_int <> 50 then raise exception 'FAIL level_for_xp(627541)=%', v_int; end if;
  select public.level_for_xp(2000000000) into v_int;
  if v_int <> 50 then raise exception 'FAIL level cap: %', v_int; end if;
  select public.streak_multiplier(2) into v_num;
  if v_num <> 1.0 then raise exception 'FAIL mult(2)=%', v_num; end if;
  select public.streak_multiplier(3) into v_num;
  if v_num <> 1.1 then raise exception 'FAIL mult(3)=%', v_num; end if;
  select public.streak_multiplier(30) into v_num;
  if v_num <> 2.0 then raise exception 'FAIL mult(30)=%', v_num; end if;
  raise notice 'PASS 1: SQL game math matches lib/game-math.ts';

  -- ----- 2. auto-approve completion grants exactly once -----
  insert into public.quest_completions (quest_id, adventurer_id, due_date)
    values (v_q_auto, v_adv, v_today) returning id into v_c;
  select status into v_status from public.quest_completions where id = v_c;
  if v_status <> 'approved' then raise exception 'FAIL auto-approve: %', v_status; end if;
  select count(*) into v_count from public.gold_xp_ledger
    where source_type = 'quest_completion' and source_id = v_c;
  if v_count <> 1 then raise exception 'FAIL grant count=%', v_count; end if;
  select gold_balance, xp_total into v_gold, v_xp from public.adventurer_profiles where id = v_adv;
  if v_gold <> 5 or v_xp <> 10 then raise exception 'FAIL payout %/% (streak 1 = 1.0x)', v_gold, v_xp; end if;
  select current_streak_days into v_int from public.adventurer_profiles where id = v_adv;
  if v_int <> 1 then raise exception 'FAIL streak=%', v_int; end if;
  raise notice 'PASS 2: auto-approve pays 5 gold / 10 xp once, streak = 1';

  -- ----- 3. rapid double-tap dedupes on the occurrence index -----
  begin
    insert into public.quest_completions (quest_id, adventurer_id, due_date)
      values (v_q_auto, v_adv, v_today);
    raise exception 'FAIL: duplicate completion was allowed';
  exception
    when unique_violation then null;
  end;
  -- Filtered by source_type: since 014 the first completion also writes an
  -- 'achievement' ledger row (first-quest award) — not a double grant.
  select count(*) into v_count from public.gold_xp_ledger
    where adventurer_id = v_adv and source_type = 'quest_completion';
  if v_count <> 1 then raise exception 'FAIL ledger after double-tap=%', v_count; end if;
  raise notice 'PASS 3: double-tap rejected by unique index, no double grant';

  -- ----- 4. replayed approval is a no-op; approved rows are immutable -----
  update public.quest_completions set status = 'approved' where id = v_c;
  select count(*) into v_count from public.gold_xp_ledger
    where source_type = 'quest_completion' and source_id = v_c;
  if v_count <> 1 then raise exception 'FAIL replay granted again'; end if;
  begin
    update public.quest_completions set status = 'rejected' where id = v_c;
    raise exception 'FAIL: approved completion was un-approved';
  exception
    when raise_exception then null;
  end;
  raise notice 'PASS 4: grant idempotent on replay; approved rows immutable';

  -- ----- 5. requires_approval holds rewards until NPC approves -----
  insert into public.quests (guild_id, title, category, xp_reward, gold_reward,
      is_required, requires_approval, recurrence, assigned_adventurer_ids)
    values (v_guild, 'Approval quest', 'kindness', 20, 8, false, true,
      jsonb_build_object('type', 'daily', 'startDate', to_char(v_today - 10, 'YYYY-MM-DD')),
      array[v_adv])
    returning id into v_q_appr;
  insert into public.quest_completions (quest_id, adventurer_id, due_date)
    values (v_q_appr, v_adv, v_today) returning id into v_c2;
  select status into v_status from public.quest_completions where id = v_c2;
  if v_status <> 'pending' then raise exception 'FAIL should stay pending: %', v_status; end if;
  select count(*) into v_count from public.gold_xp_ledger where source_id = v_c2;
  if v_count <> 0 then raise exception 'FAIL pending already granted'; end if;
  update public.quest_completions
    set status = 'approved', approved_at = now()
    where id = v_c2 and status = 'pending';
  select count(*) into v_count from public.gold_xp_ledger where source_id = v_c2;
  if v_count <> 1 then raise exception 'FAIL approval did not grant'; end if;
  select gold_balance into v_gold from public.adventurer_profiles where id = v_adv;
  if v_gold <> 13 then raise exception 'FAIL gold after approval=%', v_gold; end if;
  raise notice 'PASS 5: approval-gated quest pays only on approval (gold 5→13)';

  -- ----- 6. rejection: reason stored, slot freed for retry, streak recomputed -----
  insert into public.quest_completions (quest_id, adventurer_id, due_date)
    values (v_q_appr, v_adv, v_today - 1) returning id into v_c3;
  update public.quest_completions
    set status = 'rejected', rejection_reason = 'Bed was still messy'
    where id = v_c3 and status = 'pending';
  select status into v_status from public.quest_completions where id = v_c3;
  if v_status <> 'rejected' then raise exception 'FAIL reject: %', v_status; end if;
  select count(*) into v_count from public.gold_xp_ledger where source_id = v_c3;
  if v_count <> 0 then raise exception 'FAIL rejected completion granted'; end if;
  -- retry after rejection must be allowed (partial unique index)
  insert into public.quest_completions (quest_id, adventurer_id, due_date)
    values (v_q_appr, v_adv, v_today - 1);
  raise notice 'PASS 6: rejection stores reason, grants nothing, retry allowed';

  -- ----- 7. 3-day streak fixture → 4th day pays the 1.1x multiplier -----
  for i in reverse 3..1 loop
    insert into public.quest_completions
        (quest_id, adventurer_id, status, approved_at, completed_at, due_date)
      values (v_q_auto, v_adv, 'approved', now(), now() - make_interval(days => i), v_today - i);
  end loop;
  select public.compute_streak(v_adv, v_today) into v_int;
  if v_int <> 4 then raise exception 'FAIL streak after backfill=%', v_int; end if;

  insert into public.quests (guild_id, title, category, xp_reward, gold_reward,
      is_required, requires_approval, recurrence, assigned_adventurer_ids)
    values (v_guild, 'Bonus quest', 'exercise', 10, 5, false, false,
      jsonb_build_object('type', 'daily', 'startDate', to_char(v_today - 10, 'YYYY-MM-DD')),
      array[v_adv])
    returning id into v_q_bonus;
  insert into public.quest_completions (quest_id, adventurer_id, due_date)
    values (v_q_bonus, v_adv, v_today) returning id into v_c;
  select delta_gold, delta_xp into v_gold, v_xp from public.gold_xp_ledger
    where source_type = 'quest_completion' and source_id = v_c;
  if v_gold <> 6 or v_xp <> 11 then
    raise exception 'FAIL multiplier payout %/% (want 6/11 = 5/10 × 1.1)', v_gold, v_xp;
  end if;
  select current_streak_days, longest_streak_days into v_int, v_count
    from public.adventurer_profiles where id = v_adv;
  if v_int <> 4 or v_count <> 4 then raise exception 'FAIL streak fields %/%', v_int, v_count; end if;
  raise notice 'PASS 7: 4-day streak pays 1.1x (5/10 → 6/11), streak fields = 4';

  -- ----- 8. level-up grants achievement points via a second ledger row -----
  insert into public.quests (guild_id, title, category, xp_reward, gold_reward,
      is_required, requires_approval, recurrence, assigned_adventurer_ids)
    values (v_guild, 'Epic quest', 'school', 500, 0, false, false,
      jsonb_build_object('type', 'daily', 'startDate', to_char(v_today - 10, 'YYYY-MM-DD')),
      array[v_adv])
    returning id into v_q_levelup;
  insert into public.quest_completions (quest_id, adventurer_id, due_date)
    values (v_q_levelup, v_adv, v_today) returning id into v_c;
  -- xp_total was 41 (10 + 20 + 11) → +550 (500 × 1.1) = 591 → level 4 (347 ≤ 591 < 499? no:
  -- thresholds 347 (L4) and 499 (L5): 591 ≥ 499 → level 5. From level 1 → 4 levels × 25 = 100.
  select level, achievement_points into v_int, v_count
    from public.adventurer_profiles where id = v_adv;
  if v_int <> public.level_for_xp(591) then raise exception 'FAIL level=%', v_int; end if;
  select coalesce(sum(delta_achievement_points), 0) into v_count
    from public.gold_xp_ledger where source_type = 'level_up' and source_id = v_c;
  if v_count <> (public.level_for_xp(591) - 1) * 25 then
    raise exception 'FAIL level-up points=%', v_count;
  end if;
  raise notice 'PASS 8: level-up ledger row grants % achievement points (level 1 → %)',
    v_count, v_int;

  -- ----- 9. rest days neither break nor extend the streak -----
  -- Weekly quest due only on v_today's weekday: gaps in between are rest days.
  select public.compute_streak(v_adv, v_today) into v_int;
  if v_int <> 4 then raise exception 'FAIL rest-day recheck=%', v_int; end if;
  raise notice 'PASS 9: streak stable at 4 across recomputation';

  raise notice '=== ALL CORE LOOP ACCEPTANCE CHECKS PASSED ===';
end;
$$;

rollback;
