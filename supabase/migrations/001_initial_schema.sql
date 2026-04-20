create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id),
  timezone text not null default 'UTC',
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'pro')),
  parent_pin_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('parent', 'co_parent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, profile_id)
);

create table if not exists public.kids (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  display_name text not null,
  avatar_emoji text default '⭐',
  birth_year int,
  color_theme text default 'blue',
  points_balance int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text,
  points int not null check (points >= 0 and points <= 1000),
  schedule_type text not null check (schedule_type in ('one_time', 'daily', 'weekly', 'custom')),
  schedule_config jsonb,
  requires_approval boolean not null default false,
  high_value boolean not null default false,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chore_assignments (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (chore_id, kid_id)
);

create table if not exists public.chore_instances (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'completed_unverified', 'completed_verified', 'skipped', 'expired')),
  completed_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references public.profiles (id),
  points_awarded int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_chore_instances_family_due_status on public.chore_instances (family_id, due_date, status);
create index if not exists idx_chore_instances_kid_status on public.chore_instances (kid_id, status);

create table if not exists public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  amount int not null,
  source_type text not null check (source_type in ('chore', 'reward_redemption', 'bonus', 'adjustment')),
  source_id uuid,
  note text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  title text not null,
  description text,
  cost_points int not null check (cost_points > 0),
  icon_emoji text default '🎁',
  stock int,
  requires_approval boolean not null default true,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  cost_points int not null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'delivered', 'rejected')),
  approved_at timestamptz,
  approved_by uuid references public.profiles (id),
  delivered_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.streaks (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null unique references public.kids (id) on delete cascade,
  current_weekly_streak int not null default 0,
  longest_weekly_streak int not null default 0,
  last_week_completed date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text check (platform in ('ios', 'android')),
  device_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, token)
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.award_points(
  p_family_id uuid,
  p_kid_id uuid,
  p_amount int,
  p_source_type text,
  p_source_id uuid,
  p_note text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_transaction_id uuid;
  v_created_by uuid;
begin
  if p_amount = 0 then
    raise exception 'Points amount cannot be zero';
  end if;

  if p_source_type not in ('chore', 'reward_redemption', 'bonus', 'adjustment') then
    raise exception 'Invalid source_type: %', p_source_type;
  end if;

  select auth.uid() into v_created_by;

  insert into public.points_transactions (
    family_id,
    kid_id,
    amount,
    source_type,
    source_id,
    note,
    created_by
  )
  values (
    p_family_id,
    p_kid_id,
    p_amount,
    p_source_type,
    p_source_id,
    p_note,
    v_created_by
  )
  returning id into v_transaction_id;

  update public.kids
  set points_balance = points_balance + p_amount
  where id = p_kid_id
    and family_id = p_family_id;

  if not found then
    raise exception 'Kid % is not part of family %', p_kid_id, p_family_id;
  end if;

  return v_transaction_id;
end;
$$;

create or replace function public.redeem_reward(
  p_reward_id uuid,
  p_kid_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_reward public.rewards%rowtype;
  v_kid public.kids%rowtype;
  v_redemption_id uuid;
begin
  select * into v_reward
  from public.rewards
  where id = p_reward_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Reward % not found or inactive', p_reward_id;
  end if;

  select * into v_kid
  from public.kids
  where id = p_kid_id
    and is_active = true
  for update;

  if not found then
    raise exception 'Kid % not found or inactive', p_kid_id;
  end if;

  if v_kid.family_id <> v_reward.family_id then
    raise exception 'Reward and kid must belong to the same family';
  end if;

  if v_kid.points_balance < v_reward.cost_points then
    raise exception 'Insufficient points balance for redemption';
  end if;

  if v_reward.stock is not null and v_reward.stock <= 0 then
    raise exception 'Reward is out of stock';
  end if;

  insert into public.reward_redemptions (
    family_id,
    reward_id,
    kid_id,
    cost_points,
    status
  )
  values (
    v_reward.family_id,
    v_reward.id,
    v_kid.id,
    v_reward.cost_points,
    'requested'
  )
  returning id into v_redemption_id;

  if v_reward.stock is not null then
    update public.rewards
    set stock = stock - 1
    where id = v_reward.id
      and stock > 0;

    if not found then
      raise exception 'Reward became out of stock';
    end if;
  end if;

  perform public.award_points(
    v_reward.family_id,
    v_kid.id,
    -v_reward.cost_points,
    'reward_redemption',
    v_redemption_id,
    'Reward redemption: ' || v_reward.title
  );

  return v_redemption_id;
end;
$$;

create or replace function public.prevent_points_transactions_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'points_transactions is append-only; updates and deletes are not allowed';
end;
$$;

create or replace function public.auto_verify_chore_instance()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_requires_approval boolean;
  v_high_value boolean;
begin
  if new.status = 'completed_unverified' and old.status is distinct from 'completed_unverified' then
    select c.requires_approval, c.high_value
      into v_requires_approval, v_high_value
    from public.chores c
    where c.id = new.chore_id;

    if coalesce(v_requires_approval, true) = false and coalesce(v_high_value, false) = false then
      new.status = 'completed_verified';
      new.verified_at = coalesce(new.verified_at, now());
      new.verified_by = coalesce(new.verified_by, auth.uid());
      new.completed_at = coalesce(new.completed_at, now());
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.on_chore_instance_verified()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_points int;
begin
  if new.status = 'completed_verified' and old.status is distinct from 'completed_verified' then
    select points into v_points
    from public.chores
    where id = new.chore_id;

    new.points_awarded = coalesce(new.points_awarded, v_points);

    perform public.award_points(
      new.family_id,
      new.kid_id,
      new.points_awarded,
      'chore',
      new.id,
      'Chore completed: ' || coalesce((select title from public.chores where id = new.chore_id), 'Unknown chore')
    );
  end if;

  return new;
end;
$$;

create trigger trg_chore_instances_auto_verify
  before update on public.chore_instances
  for each row execute function public.auto_verify_chore_instance();

create trigger trg_chore_instances_award_points
  before update on public.chore_instances
  for each row execute function public.on_chore_instance_verified();

create trigger trg_points_transactions_immutable
  before update or delete on public.points_transactions
  for each row execute function public.prevent_points_transactions_mutation();

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_families_updated_at
  before update on public.families
  for each row execute function public.set_updated_at();

create trigger trg_family_members_updated_at
  before update on public.family_members
  for each row execute function public.set_updated_at();

create trigger trg_kids_updated_at
  before update on public.kids
  for each row execute function public.set_updated_at();

create trigger trg_chores_updated_at
  before update on public.chores
  for each row execute function public.set_updated_at();

create trigger trg_chore_assignments_updated_at
  before update on public.chore_assignments
  for each row execute function public.set_updated_at();

create trigger trg_chore_instances_updated_at
  before update on public.chore_instances
  for each row execute function public.set_updated_at();

create trigger trg_points_transactions_updated_at
  before update on public.points_transactions
  for each row execute function public.set_updated_at();

create trigger trg_rewards_updated_at
  before update on public.rewards
  for each row execute function public.set_updated_at();

create trigger trg_reward_redemptions_updated_at
  before update on public.reward_redemptions
  for each row execute function public.set_updated_at();

create trigger trg_streaks_updated_at
  before update on public.streaks
  for each row execute function public.set_updated_at();

create trigger trg_push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.set_updated_at();
