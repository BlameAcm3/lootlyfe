-- Local-dev seed: a 3-day streak fixture for the core game loop.
--
-- Attaches to the FIRST guild + its first active adventurer (skips with a
-- notice when none exist yet — sign up, create a guild and an adventurer,
-- then `supabase db reset` or re-run the seed).
--
-- Creates a required, auto-approved daily quest and approved completions for
-- the three days before today (UTC). The grant triggers from 013 fire per
-- insert, so the ledger, profile aggregates, and current_streak_days = 3 all
-- come out of the real pipeline — completing the quest "today" in the app
-- should then pay out at the 1.1x streak multiplier (streak day 4).

do $$
declare
  v_guild uuid;
  v_adventurer uuid;
  v_quest uuid;
  v_today date := (now() at time zone 'utc')::date;
begin
  select id into v_guild from public.guilds order by created_at limit 1;
  if v_guild is null then
    raise notice 'seed: no guild yet — create one in the app, then re-seed.';
    return;
  end if;

  select id into v_adventurer
    from public.adventurer_profiles
    where guild_id = v_guild and archived_at is null
    order by created_at
    limit 1;
  if v_adventurer is null then
    raise notice 'seed: no adventurer yet — add one in the app, then re-seed.';
    return;
  end if;

  insert into public.quests
      (guild_id, title, description, category, xp_reward, gold_reward,
       is_required, requires_approval, recurrence, assigned_adventurer_ids,
       source_preset_id)
    values
      (v_guild, 'Make your bed', 'Seeded streak quest.', 'chores', 10, 5,
       true, false,
       jsonb_build_object(
         'type', 'daily',
         'startDate', to_char(v_today - 10, 'YYYY-MM-DD')),
       array[v_adventurer], 'make-bed')
    returning id into v_quest;

  -- Three consecutive completed days ending yesterday → streak 3.
  for i in reverse 3..1 loop
    insert into public.quest_completions
        (quest_id, adventurer_id, status, approved_at, completed_at, due_date)
      values
        (v_quest, v_adventurer, 'approved', now(),
         now() - make_interval(days => i), v_today - i);
  end loop;

  raise notice 'seed: streak fixture ready (quest %, adventurer %).', v_quest, v_adventurer;
end;
$$;
