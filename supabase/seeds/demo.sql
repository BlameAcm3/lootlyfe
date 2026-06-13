-- ===========================================================================
-- Lootlyfe DEMO seed — TestFlight demo + App Store screenshot fixture.
-- ===========================================================================
--
-- Populates a believable, lived-in guild that drives the whole game loop
-- through the REAL server pipeline (no fabricated aggregates): completions go
-- in as `approved` so the 013 grant trigger computes streak/gold/XP and the
-- 006 ledger trigger folds them into each adventurer's profile. What you see
-- on the dashboard is what the production code would have produced.
--
-- WHAT IT CREATES (in the FIRST guild — see "TARGETING" below):
--   * Guild upgraded to `premium` (so both theme packs + unlimited content show)
--   * 2 adventurers on DIFFERENT theme packs: Pip (high-fantasy/ember, 9-12)
--     and Roo (sci-fi/nebula, 5-8)
--   * 12 quests spanning every recurrence type (daily / weekly / monthly /
--     once), a mix of required/optional and approval/auto-approve
--   * Completion history yielding a 5-day streak (Pip) and a 3-day streak (Roo)
--   * 5 loot items (mix of unlimited + finite stock)
--   * 1 PENDING loot redemption (Pip → "Pick the movie tonight")
--   * 1 PROPOSED wishlist item (Roo → "Trip to the trampoline park")
--
-- TARGETING / IDEMPOTENCY (this is also the "reset to demo state" mechanism):
--   The script targets the OLDEST guild and OWNS ITS CONTENTS: every run first
--   deletes ALL adventurers, quests, and loot in that guild (cascading away
--   their completions, redemptions, wishlist, and ledger) and rebuilds from
--   scratch. So re-running == reset to demo state. Because it replaces the
--   guild's entire content, run it ONLY against a DEDICATED demo account.
--
--   Targeting the oldest guild (not creating a new one) matters: the app shows
--   the guild it already selected for the signed-in parent, so the demo data
--   actually appears on screen and in screenshots.
--
-- PREREQUISITE: sign up as a parent and create a guild in the app first
--   (that creates the auth user + guild + owner NPC this script attaches to).
--   With no guild yet, the script prints a notice and makes no changes.
--
-- HOW TO RUN — see supabase/seeds/README.md. In short:
--   * Local:  docker exec -i supabase_db_lootlyfe psql -U postgres -d postgres \
--               < supabase/seeds/demo.sql
--   * Remote (staging/TestFlight backend): paste into the Supabase SQL editor.
--   Push is a no-op here (private.push_config is unset), so the bulk insert
--   never tries to deliver notifications.
-- ===========================================================================

do $$
declare
  v_user      uuid;
  v_display   text;
  v_guild     uuid;
  v_owner_npc uuid;
  v_pip       uuid;
  v_roo       uuid;
  v_today     date := (now() at time zone 'utc')::date;
  v_anchor_pip uuid;   -- Pip's daily required quest: the 5-day streak driver
  v_anchor_roo uuid;   -- Roo's daily required quest: the 3-day streak driver
  v_loot_movie uuid;   -- target of the pending redemption
  i integer;
begin
  -- 1. Attach to the oldest guild + its owner NPC (created by app signup).
  select g.id, g.owner_npc_id into v_guild, v_owner_npc
    from public.guilds g
    order by g.created_at
    limit 1;
  if v_guild is null then
    raise notice 'demo seed: no guild yet — sign up and create a guild in the app, then re-run.';
    return;
  end if;

  if v_owner_npc is null then
    select id into v_owner_npc
      from public.npc_profiles
      where guild_id = v_guild
      order by created_at
      limit 1;
  end if;
  if v_owner_npc is null then
    raise notice 'demo seed: guild % has no NPC profile — finish onboarding first.', v_guild;
    return;
  end if;
  select user_id, display_name into v_user, v_display
    from public.npc_profiles where id = v_owner_npc;

  -- 2. Reset: wipe this guild's demo content (cascades clear all child rows).
  delete from public.quest_completions c
    using public.adventurer_profiles a
    where c.adventurer_id = a.id and a.guild_id = v_guild;
  delete from public.adventurer_profiles where guild_id = v_guild; -- cascades redemptions, wishlist, ledger, cosmetics
  delete from public.quests where guild_id = v_guild;
  delete from public.loot_items where guild_id = v_guild;

  -- 3. Premium entitlement so both theme packs + unlimited content are visible
  --    (and the free-tier INSERT guards in 017 stand down for the bulk seed).
  update public.guilds set subscription_entitlement = 'premium' where id = v_guild;

  -- 4. Adventurers — deliberately on different theme packs.
  insert into public.adventurer_profiles (guild_id, nickname, age_bucket, theme_id, variant_id)
    values (v_guild, 'Pip', '9-12', 'high-fantasy', 'ember')
    returning id into v_pip;
  insert into public.adventurer_profiles (guild_id, nickname, age_bucket, theme_id, variant_id)
    values (v_guild, 'Roo', '5-8', 'sci-fi', 'nebula')
    returning id into v_roo;

  -- Starter balances/levels via a manual ledger adjustment, so the dashboard
  -- looks lived-in (the completion grants below add to these).
  insert into public.gold_xp_ledger
      (adventurer_id, delta_gold, delta_xp, delta_achievement_points, source_type, source_id)
    values
      (v_pip, 200, 450, 60, 'seed_grant', null),
      (v_roo, 120, 250, 30, 'seed_grant', null);

  -- 5. Quests (12, every recurrence type). Required quests other than the
  --    streak anchors start TODAY (startDate = today) so they are never "due"
  --    in the past streak window and cannot retroactively break the streak.

  -- --- Pip (5-day streak driver: daily, required, auto-approve, week-old) ---
  insert into public.quests
      (guild_id, title, description, category, xp_reward, gold_reward,
       is_required, requires_approval, recurrence, assigned_adventurer_ids, source_preset_id)
    values (v_guild, 'Make your bed', 'Start the day like a hero.', 'bedroom', 15, 10,
       true, false,
       jsonb_build_object('type', 'daily', 'startDate', to_char(v_today - 6, 'YYYY-MM-DD')),
       array[v_pip], 'make-bed')
    returning id into v_anchor_pip;

  insert into public.quests
      (guild_id, title, description, category, xp_reward, gold_reward,
       is_required, requires_approval, recurrence, assigned_adventurer_ids, source_preset_id)
    values
      (v_guild, 'Brush teeth, morning and night', 'Twice a day keeps the dragon breath away.', 'hygiene',
       10, 5, true, false,
       jsonb_build_object('type', 'daily', 'startDate', to_char(v_today, 'YYYY-MM-DD')),
       array[v_pip], 'brush-teeth'),
      (v_guild, 'Read for 20 minutes', 'Any book counts. Comics too.', 'learning',
       20, 10, false, true,
       jsonb_build_object('type', 'daily'),
       array[v_pip], 'read-20'),
      (v_guild, 'Take out the trash', 'Bins to the curb before bedtime.', 'chores',
       15, 15, true, true,
       jsonb_build_object('type', 'weekly', 'days', jsonb_build_array(1), 'startDate', to_char(v_today, 'YYYY-MM-DD')),
       array[v_pip], null),
      (v_guild, 'Vacuum the living room', 'Edges and under the couch cushions.', 'chores',
       25, 20, false, true,
       jsonb_build_object('type', 'weekly', 'days', jsonb_build_array(6)),
       array[v_pip], null),
      (v_guild, 'Deep-clean your room', 'Once a month, the whole thing.', 'bedroom',
       50, 40, false, true,
       jsonb_build_object('type', 'monthly', 'day', 1),
       array[v_pip], null),
      (v_guild, 'Help carry in the groceries', 'A one-time hand this week.', 'chores',
       15, 10, false, true,
       jsonb_build_object('type', 'once', 'date', to_char(v_today + 2, 'YYYY-MM-DD')),
       array[v_pip], null);

  -- --- Roo (3-day streak driver: daily, required, auto-approve, 3 days old) ---
  insert into public.quests
      (guild_id, title, description, category, xp_reward, gold_reward,
       is_required, requires_approval, recurrence, assigned_adventurer_ids, source_preset_id)
    values (v_guild, 'Feed the dog', 'Breakfast and dinner for a very good boy.', 'pets', 12, 8,
       true, false,
       jsonb_build_object('type', 'daily', 'startDate', to_char(v_today - 3, 'YYYY-MM-DD')),
       array[v_roo], null)
    returning id into v_anchor_roo;

  insert into public.quests
      (guild_id, title, description, category, xp_reward, gold_reward,
       is_required, requires_approval, recurrence, assigned_adventurer_ids, source_preset_id)
    values
      (v_guild, 'Put your toys away', 'Floor clear before lights out.', 'bedroom',
       10, 5, false, false,
       jsonb_build_object('type', 'daily'),
       array[v_roo], null),
      (v_guild, 'Water the plants', 'A little drink on Wednesdays.', 'chores',
       15, 10, true, true,
       jsonb_build_object('type', 'weekly', 'days', jsonb_build_array(3), 'startDate', to_char(v_today, 'YYYY-MM-DD')),
       array[v_roo], null),
      (v_guild, 'Practice spelling words', 'Tuesdays and Thursdays.', 'learning',
       20, 12, false, true,
       jsonb_build_object('type', 'weekly', 'days', jsonb_build_array(2, 4)),
       array[v_roo], null),
      (v_guild, 'Tidy the art supplies', 'A one-time cleanup tomorrow.', 'chores',
       12, 8, false, true,
       jsonb_build_object('type', 'once', 'date', to_char(v_today + 1, 'YYYY-MM-DD')),
       array[v_roo], null);

  -- 6. Completion history → streaks through the real grant pipeline.
  --    Inserting oldest-first keeps compute_streak monotonic; the final insert
  --    sets current_streak_days = 5 (Pip) / 3 (Roo).
  for i in reverse 5..1 loop
    insert into public.quest_completions
        (quest_id, adventurer_id, status, approved_at, approved_by_npc_id, completed_at, due_date)
      values (v_anchor_pip, v_pip, 'approved',
              now() - make_interval(days => i), v_owner_npc,
              now() - make_interval(days => i), v_today - i);
  end loop;

  for i in reverse 3..1 loop
    insert into public.quest_completions
        (quest_id, adventurer_id, status, approved_at, approved_by_npc_id, completed_at, due_date)
      values (v_anchor_roo, v_roo, 'approved',
              now() - make_interval(days => i), v_owner_npc,
              now() - make_interval(days => i), v_today - i);
  end loop;

  -- 7. Loot catalog (mix of unlimited and finite stock).
  insert into public.loot_items (guild_id, name, description, gold_cost, stock, created_by_npc_id)
    values (v_guild, 'Pick the movie tonight', 'You choose what the family watches.', 75, null, v_owner_npc)
    returning id into v_loot_movie;

  insert into public.loot_items (guild_id, name, description, gold_cost, stock, created_by_npc_id)
    values
      (v_guild, '30 minutes extra screen time', 'Cash it in any day this week.', 50, null, v_owner_npc),
      (v_guild, 'Ice cream trip', 'Off to the parlor — sprinkles included.', 120, null, v_owner_npc),
      (v_guild, 'Stay up 30 minutes late', 'A later bedtime, just this once.', 90, 3, v_owner_npc),
      (v_guild, 'Brand-new art set', 'The big one with all the colors.', 300, 1, v_owner_npc);

  -- 8. One PENDING redemption (Pip). gold_spent is stamped from the loot's live
  --    cost by the 015 trigger and the gold is held immediately; pass 0 here.
  insert into public.loot_redemptions (loot_id, adventurer_id, status, gold_spent)
    values (v_loot_movie, v_pip, 'pending', 0);

  -- 9. One PROPOSED wishlist item (Roo) awaiting a parent decision.
  insert into public.loot_wishlist (adventurer_id, name, description, proposed_gold_cost, status)
    values (v_roo, 'Trip to the trampoline park', 'For Saturday, please please please.', 250, 'proposed');

  raise notice 'demo seed ready in guild % (owner npc %, parent %): Pip=% (5-day streak), Roo=% (3-day streak).',
    v_guild, v_owner_npc, coalesce(nullif(v_display, ''), '?'), v_pip, v_roo;
end $$;
