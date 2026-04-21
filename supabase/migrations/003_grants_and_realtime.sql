-- Allow authenticated clients to call RPCs used by the app (PostgREST).
grant execute on function public.award_points(uuid, uuid, integer, text, uuid, text) to authenticated;
grant execute on function public.redeem_reward(uuid, uuid) to authenticated;

-- Postgres maps SQL `int` to `integer`; signature must match catalog.
-- Realtime: tables referenced in src/shared/lib/realtime.ts (postgres_changes).
alter publication supabase_realtime add table public.chores;
alter publication supabase_realtime add table public.rewards;
alter publication supabase_realtime add table public.reward_redemptions;
alter publication supabase_realtime add table public.chore_instances;
alter publication supabase_realtime add table public.kids;
