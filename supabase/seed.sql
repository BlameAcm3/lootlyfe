do $$
declare
  v_parent_id uuid;
  v_family_id uuid := '11111111-1111-1111-1111-111111111111';
  v_kid_ava_id uuid := '22222222-2222-2222-2222-222222222221';
  v_kid_noah_id uuid := '22222222-2222-2222-2222-222222222222';
begin
  select id into v_parent_id
  from public.profiles
  order by created_at
  limit 1;

  if v_parent_id is null then
    raise exception 'Seed requires at least one profile row. Sign up once, then re-run seed.';
  end if;

  insert into public.families (id, name, created_by, timezone, subscription_tier, parent_pin_hash)
  values (
    v_family_id,
    'The Rivera Family',
    v_parent_id,
    'America/New_York',
    'free',
    null
  )
  on conflict (id) do nothing;

  insert into public.family_members (family_id, profile_id, role)
  values (v_family_id, v_parent_id, 'parent')
  on conflict (family_id, profile_id) do nothing;

  insert into public.kids (id, family_id, display_name, avatar_emoji, birth_year, color_theme, points_balance, is_active)
  values
    (v_kid_ava_id, v_family_id, 'Ava', '🦄', extract(year from now())::int - 7, 'purple', 0, true),
    (v_kid_noah_id, v_family_id, 'Noah', '🦖', extract(year from now())::int - 10, 'green', 0, true)
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_emoji = excluded.avatar_emoji,
    birth_year = excluded.birth_year,
    color_theme = excluded.color_theme,
    is_active = excluded.is_active;

  insert into public.streaks (kid_id, current_weekly_streak, longest_weekly_streak, last_week_completed)
  values
    (v_kid_ava_id, 1, 2, current_date - 7),
    (v_kid_noah_id, 2, 3, current_date - 7)
  on conflict (kid_id) do update set
    current_weekly_streak = excluded.current_weekly_streak,
    longest_weekly_streak = excluded.longest_weekly_streak,
    last_week_completed = excluded.last_week_completed;
end;
$$;

insert into public.chores (id, family_id, title, description, points, schedule_type, schedule_config, requires_approval, high_value, is_active, created_by)
values
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'Make Bed', 'Straighten blanket and pillows before breakfast.', 10, 'daily', null, false, false, true, (select id from public.profiles order by created_at limit 1)),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'Feed the Cat', 'Measure and serve cat food morning and evening.', 15, 'daily', null, false, false, true, (select id from public.profiles order by created_at limit 1)),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'Put Toys Away', 'Put all toys back into bins before dinner.', 12, 'daily', null, false, false, true, (select id from public.profiles order by created_at limit 1)),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111111', 'Water Plants', 'Water indoor plants with the small watering can.', 20, 'weekly', '{"days":[0,3]}'::jsonb, false, false, true, (select id from public.profiles order by created_at limit 1)),
  ('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111111', 'Take Out Trash', 'Take kitchen trash and recycling to outside bins.', 25, 'weekly', '{"days":[2,5]}'::jsonb, false, false, true, (select id from public.profiles order by created_at limit 1)),
  ('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111111', 'Unload Dishwasher', 'Put away clean dishes safely.', 22, 'daily', null, false, false, true, (select id from public.profiles order by created_at limit 1)),
  ('33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111111', 'Sweep Kitchen Floor', 'Sweep crumbs and dirt after dinner.', 18, 'weekly', '{"days":[1,4]}'::jsonb, false, false, true, (select id from public.profiles order by created_at limit 1)),
  ('33333333-3333-3333-3333-333333333308', '11111111-1111-1111-1111-111111111111', 'Pack School Bag', 'Check homework, water bottle, and lunch.', 14, 'daily', null, false, false, true, (select id from public.profiles order by created_at limit 1))
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  points = excluded.points,
  schedule_type = excluded.schedule_type,
  schedule_config = excluded.schedule_config,
  requires_approval = excluded.requires_approval,
  high_value = excluded.high_value,
  is_active = excluded.is_active;

insert into public.chore_assignments (chore_id, kid_id)
values
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222221'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222221'),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222221'),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222221'),
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222222'),
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222222')
on conflict (chore_id, kid_id) do nothing;

insert into public.rewards (id, family_id, title, description, cost_points, icon_emoji, stock, requires_approval, is_active, created_by)
values
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111', 'Movie Night Pick', 'Choose the movie for family night.', 80, '🎬', null, true, true, (select id from public.profiles order by created_at limit 1)),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111111', 'Extra 30 Minutes Screen Time', 'Bonus screen time after homework.', 60, '📱', null, true, true, (select id from public.profiles order by created_at limit 1)),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111111', 'Pick Dinner Dessert', 'Choose the dessert for dinner.', 70, '🍨', 4, true, true, (select id from public.profiles order by created_at limit 1)),
  ('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111111', 'Weekend Park Trip', 'Family park adventure on Saturday.', 150, '🏞️', 2, true, true, (select id from public.profiles order by created_at limit 1)),
  ('44444444-4444-4444-4444-444444444405', '11111111-1111-1111-1111-111111111111', 'Stay Up 20 Minutes Late', 'Later bedtime for one night.', 50, '🌙', null, true, true, (select id from public.profiles order by created_at limit 1))
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  cost_points = excluded.cost_points,
  icon_emoji = excluded.icon_emoji,
  stock = excluded.stock,
  requires_approval = excluded.requires_approval,
  is_active = excluded.is_active;

delete from public.chore_instances
where family_id = '11111111-1111-1111-1111-111111111111'
  and due_date between current_date - 6 and current_date;

insert into public.chore_instances (id, chore_id, kid_id, family_id, due_date, status, completed_at, verified_at, verified_by, points_awarded)
select
  gen_random_uuid(),
  ca.chore_id,
  ca.kid_id,
  k.family_id,
  d::date,
  case
    when d < current_date - 3 then 'completed_verified'
    when d = current_date - 2 then 'completed_unverified'
    else 'pending'
  end,
  case
    when d <= current_date - 2 then d::timestamptz + interval '18 hours'
    else null
  end,
  case
    when d < current_date - 3 then d::timestamptz + interval '19 hours'
    else null
  end,
  case
    when d < current_date - 3 then (select id from public.profiles order by created_at limit 1)
    else null
  end,
  case
    when d < current_date - 3 then c.points
    else null
  end
from generate_series(current_date - 6, current_date, interval '1 day') d
join public.chore_assignments ca on true
join public.kids k on k.id = ca.kid_id
join public.chores c on c.id = ca.chore_id
where k.family_id = '11111111-1111-1111-1111-111111111111';

delete from public.points_transactions
where family_id = '11111111-1111-1111-1111-111111111111'
  and note like 'Seed:%';

with verified as (
  select ci.id, ci.family_id, ci.kid_id, ci.points_awarded
  from public.chore_instances ci
  where ci.family_id = '11111111-1111-1111-1111-111111111111'
    and ci.status = 'completed_verified'
)
insert into public.points_transactions (family_id, kid_id, amount, source_type, source_id, note, created_by)
select
  v.family_id,
  v.kid_id,
  v.points_awarded,
  'chore',
  v.id,
  'Seed: completed verified chore instance',
  (select id from public.profiles order by created_at limit 1)
from verified v;

update public.kids k
set points_balance = coalesce(t.total_points, 0)
from (
  select kid_id, sum(amount) as total_points
  from public.points_transactions
  where family_id = '11111111-1111-1111-1111-111111111111'
  group by kid_id
) t
where k.id = t.kid_id
  and k.family_id = '11111111-1111-1111-1111-111111111111';
