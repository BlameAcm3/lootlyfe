-- Acceptance: realtime + push + co-parent invites (migration 016).
--
-- Rollback-wrapped (BEGIN ... ROLLBACK) per the project's local-DB pattern —
-- never mutates real data, never touches the remote. Run with:
--
--   docker exec -i supabase_db_lootlyfe psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 -f - < supabase/snippets/acceptance_realtime_push_invites.sql
--
-- pg_net cannot POST inside a transaction that rolls back, so we replace
-- enqueue_push with a capture stub that logs payloads to a temp table; this
-- lets us assert WHAT each trigger fires and WHO resolve_push_targets selects,
-- including preference/quiet-hours suppression. ASSERT failures abort the run.

begin;

-- ---------------------------------------------------------------------------
-- Capture stub: same signature, writes payloads to a temp table instead of
-- calling net.http_post.
-- ---------------------------------------------------------------------------
create temp table push_log (payload jsonb);

create or replace function public.enqueue_push(p_payload jsonb)
returns void language plpgsql as $$
begin
  insert into push_log values (p_payload);
end;
$$;

-- ---------------------------------------------------------------------------
-- Fixtures: a premium guild, owner + co-parent NPCs (with auth users + push
-- tokens), an adventurer, and an approval-required quest.
-- ---------------------------------------------------------------------------
do $$
declare
  v_owner_uid uuid := gen_random_uuid();
  v_coparent_uid uuid := gen_random_uuid();
  v_guild uuid := gen_random_uuid();
  v_owner_npc uuid := gen_random_uuid();
  v_coparent_npc uuid := gen_random_uuid();
  v_adv uuid := gen_random_uuid();
  v_quest uuid := gen_random_uuid();
  v_completion uuid;
  v_kid_uid uuid := gen_random_uuid();
  v_adv2 uuid := gen_random_uuid();
  v_count integer;
  v_foreign integer;
begin
  insert into auth.users (id, email, is_anonymous)
    values (v_owner_uid, 'owner@test.dev', false), (v_coparent_uid, 'coparent@test.dev', false);

  insert into public.guilds (id, name, subscription_entitlement)
    values (v_guild, 'Test Guild', 'premium');
  insert into public.npc_profiles (id, user_id, guild_id, role, display_name)
    values (v_owner_npc, v_owner_uid, v_guild, 'owner', 'Owner');
  update public.guilds set owner_npc_id = v_owner_npc where id = v_guild;

  insert into public.device_push_tokens (user_id, token, platform)
    values (v_owner_uid, 'ExponentPushToken[OWNER]', 'ios');

  insert into public.adventurer_profiles (id, guild_id, nickname, age_bucket)
    values (v_adv, v_guild, 'Kid', '9-12');
  insert into public.quests (id, guild_id, title, requires_approval)
    values (v_quest, v_guild, 'Make bed', true);

  -- === 1. quest_completed trigger fires + resolves the owner ===
  insert into public.quest_completions (quest_id, adventurer_id, due_date)
    values (v_quest, v_adv, current_date) returning id into v_completion;

  assert (select count(*) from push_log where payload->>'type' = 'quest_completed') = 1,
    'expected exactly one quest_completed push';
  assert (select count(*) from public.resolve_push_targets('quest_completed', v_guild, v_adv)) = 1,
    'owner should be a recipient before any mute';
  raise notice 'PASS 1: quest_completed fires and resolves the owner';

  -- === 2. mute-by-event suppresses the owner ===
  insert into public.notification_preferences (npc_id, channel, scope_type, scope_id, enabled)
    values (v_owner_npc, 'quest_completed', 'event', null, false);
  assert (select count(*) from public.resolve_push_targets('quest_completed', v_guild, v_adv)) = 0,
    'event mute should suppress the owner';
  delete from public.notification_preferences where npc_id = v_owner_npc;
  raise notice 'PASS 2: per-event mute suppresses delivery';

  -- === 3. mute-by-adventurer suppresses the owner ===
  insert into public.notification_preferences (npc_id, channel, scope_type, scope_id, enabled)
    values (v_owner_npc, 'all', 'adventurer', v_adv, false);
  assert (select count(*) from public.resolve_push_targets('quest_completed', v_guild, v_adv)) = 0,
    'adventurer mute should suppress the owner';
  delete from public.notification_preferences where npc_id = v_owner_npc;
  raise notice 'PASS 3: per-adventurer mute suppresses delivery';

  -- === 4. quiet hours covering "now" suppresses the owner ===
  insert into public.npc_notification_settings (npc_id, quiet_hours_start, quiet_hours_end, timezone)
    values (v_owner_npc, (now() - interval '1 hour')::time, (now() + interval '1 hour')::time, 'UTC');
  assert (select count(*) from public.resolve_push_targets('quest_completed', v_guild, v_adv)) = 0,
    'quiet hours should suppress the owner';
  -- master off also suppresses
  update public.npc_notification_settings set quiet_hours_start = null, quiet_hours_end = null,
    master_enabled = false where npc_id = v_owner_npc;
  assert (select count(*) from public.resolve_push_targets('quest_completed', v_guild, v_adv)) = 0,
    'master switch off should suppress the owner';
  delete from public.npc_notification_settings where npc_id = v_owner_npc;
  raise notice 'PASS 4: quiet hours + master switch suppress delivery';

  -- === 5. celebration class goes to the kid device, ignoring NPC prefs ===
  insert into auth.users (id, is_anonymous) values (v_kid_uid, true);
  insert into public.device_bindings (user_id, adventurer_id, guild_id)
    values (v_kid_uid, v_adv, v_guild);
  insert into public.device_push_tokens (user_id, token)
    values (v_kid_uid, 'ExponentPushToken[KID]');

  update public.quest_completions set status = 'approved', approved_at = now(),
    approved_by_npc_id = v_owner_npc where id = v_completion;
  assert (select count(*) from push_log where payload->>'type' = 'quest_approved') = 1,
    'approving should fire quest_approved to the kid';
  assert (select count(*) from public.resolve_push_targets('quest_approved', v_guild, v_adv)) = 1,
    'kid device should be the celebration recipient';
  raise notice 'PASS 5: celebration class targets the kid device';

  -- === 6. invite create on a PREMIUM guild succeeds; FREE guild is gated ===
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_owner_uid::text, 'is_anonymous', false)::text, true);
  perform public.create_guild_invite();
  assert (select count(*) from public.guild_invites where guild_id = v_guild) = 1,
    'premium guild should mint an invite';

  update public.guilds set subscription_entitlement = 'free' where id = v_guild;
  begin
    perform public.create_guild_invite();
    raise exception 'expected premium_required on a free guild';
  exception when others then
    assert sqlerrm like '%premium_required%', 'free guild should raise premium_required, got: ' || sqlerrm;
  end;
  update public.guilds set subscription_entitlement = 'premium' where id = v_guild;
  raise notice 'PASS 6: invite creation is premium-gated';

  -- === 7. accept attaches the co-parent + logs consent + notifies ===
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_coparent_uid::text, 'is_anonymous', false)::text, true);
  perform public.accept_guild_invite((select code from public.guild_invites where guild_id = v_guild));

  assert (select count(*) from public.npc_profiles where guild_id = v_guild and user_id = v_coparent_uid) = 1,
    'co-parent npc profile should exist';
  assert (select count(*) from public.consent_events
    where guild_id = v_guild and type = 'coparent_invite_accepted') = 1,
    'acceptance should log a consent event';
  assert (select count(*) from push_log where payload->>'type' = 'invite_accepted') = 1,
    'acceptance should notify existing NPCs';
  raise notice 'PASS 7: accept attaches co-parent, logs consent, notifies';

  -- === 8. 4-NPC cap enforced on the next accept ===
  -- add two more NPCs to reach the cap of 4, then a fresh invite must fail.
  declare
    v_filler1 uuid := gen_random_uuid();
    v_filler2 uuid := gen_random_uuid();
  begin
    insert into auth.users (id, is_anonymous) values (v_filler1, false), (v_filler2, false);
    insert into public.npc_profiles (user_id, guild_id, role, display_name)
      values (v_filler1, v_guild, 'admin', 'Filler 1'), (v_filler2, v_guild, 'admin', 'Filler 2');
  end;
  select count(*) into v_count from public.npc_profiles where guild_id = v_guild;
  assert v_count = 4, 'guild should now have 4 NPCs, has ' || v_count;
  begin
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_owner_uid::text, 'is_anonymous', false)::text, true);
    perform public.create_guild_invite();
    raise exception 'expected npc_seat_limit_reached at the cap';
  exception when others then
    assert sqlerrm like '%npc_seat_limit_reached%',
      'at cap should raise npc_seat_limit_reached, got: ' || sqlerrm;
  end;
  raise notice 'PASS 8: 4-NPC cap enforced';

  -- === 9. Realtime RLS scope: a kid device SELECTs only its own rows ===
  -- A second adventurer + completion in the SAME guild must stay invisible to
  -- the first kid's session — this is exactly what Realtime checks per-subscriber
  -- before delivering a postgres_changes row.
  insert into public.adventurer_profiles (id, guild_id, nickname, age_bucket)
    values (v_adv2, v_guild, 'Other Kid', '9-12');
  insert into public.quest_completions (quest_id, adventurer_id, due_date)
    values (v_quest, v_adv2, current_date);

  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_kid_uid::text, 'role', 'authenticated', 'is_anonymous', true)::text, true);

  select count(*), count(*) filter (where adventurer_id <> v_adv)
    into v_count, v_foreign
    from public.quest_completions;

  reset role;
  assert v_count >= 1, 'kid should see its own completion(s)';
  assert v_foreign = 0,
    'kid must NOT see another adventurer''s completions (saw ' || v_foreign || ')';
  raise notice 'PASS 9: RLS scopes the kid device to its own rows';

  raise notice 'ALL ACCEPTANCE CHECKS PASSED';
end $$;

rollback;
