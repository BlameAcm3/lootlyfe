alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.kids enable row level security;
alter table public.chores enable row level security;
alter table public.chore_assignments enable row level security;
alter table public.chore_instances enable row level security;
alter table public.points_transactions enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.streaks enable row level security;
alter table public.push_tokens enable row level security;

create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.profile_id = auth.uid()
  );
$$;

create or replace function public.can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_profile_id = auth.uid()
    or exists (
      select 1
      from public.family_members me
      join public.family_members them
        on them.family_id = me.family_id
      where me.profile_id = auth.uid()
        and them.profile_id = target_profile_id
    );
$$;

drop policy if exists "profiles_select_self_or_shared_family" on public.profiles;
create policy "profiles_select_self_or_shared_family"
on public.profiles
for select
using (public.can_access_profile(id));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "families_select_member" on public.families;
create policy "families_select_member"
on public.families
for select
using (public.is_family_member(id) or created_by = auth.uid());

drop policy if exists "families_insert_owner" on public.families;
create policy "families_insert_owner"
on public.families
for insert
with check (created_by = auth.uid());

drop policy if exists "families_update_member" on public.families;
create policy "families_update_member"
on public.families
for update
using (public.is_family_member(id) or created_by = auth.uid())
with check (public.is_family_member(id) or created_by = auth.uid());

drop policy if exists "families_delete_member" on public.families;
create policy "families_delete_member"
on public.families
for delete
using (public.is_family_member(id) or created_by = auth.uid());

drop policy if exists "family_members_select_member" on public.family_members;
create policy "family_members_select_member"
on public.family_members
for select
using (public.is_family_member(family_id));

drop policy if exists "family_members_insert_member" on public.family_members;
create policy "family_members_insert_member"
on public.family_members
for insert
with check (
  public.is_family_member(family_id)
  or (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.families f
      where f.id = family_members.family_id
        and f.created_by = auth.uid()
    )
  )
);

drop policy if exists "family_members_update_member" on public.family_members;
create policy "family_members_update_member"
on public.family_members
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

drop policy if exists "family_members_delete_member" on public.family_members;
create policy "family_members_delete_member"
on public.family_members
for delete
using (public.is_family_member(family_id));

drop policy if exists "kids_select_member" on public.kids;
create policy "kids_select_member"
on public.kids
for select
using (public.is_family_member(family_id));

drop policy if exists "kids_insert_member" on public.kids;
create policy "kids_insert_member"
on public.kids
for insert
with check (public.is_family_member(family_id));

drop policy if exists "kids_update_member" on public.kids;
create policy "kids_update_member"
on public.kids
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

drop policy if exists "kids_delete_member" on public.kids;
create policy "kids_delete_member"
on public.kids
for delete
using (public.is_family_member(family_id));

drop policy if exists "chores_select_member" on public.chores;
create policy "chores_select_member"
on public.chores
for select
using (public.is_family_member(family_id));

drop policy if exists "chores_insert_member" on public.chores;
create policy "chores_insert_member"
on public.chores
for insert
with check (public.is_family_member(family_id));

drop policy if exists "chores_update_member" on public.chores;
create policy "chores_update_member"
on public.chores
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

drop policy if exists "chores_delete_member" on public.chores;
create policy "chores_delete_member"
on public.chores
for delete
using (public.is_family_member(family_id));

drop policy if exists "chore_assignments_select_member" on public.chore_assignments;
create policy "chore_assignments_select_member"
on public.chore_assignments
for select
using (
  exists (
    select 1
    from public.chores c
    where c.id = chore_assignments.chore_id
      and public.is_family_member(c.family_id)
  )
);

drop policy if exists "chore_assignments_insert_member" on public.chore_assignments;
create policy "chore_assignments_insert_member"
on public.chore_assignments
for insert
with check (
  exists (
    select 1
    from public.chores c
    where c.id = chore_assignments.chore_id
      and public.is_family_member(c.family_id)
  )
);

drop policy if exists "chore_assignments_update_member" on public.chore_assignments;
create policy "chore_assignments_update_member"
on public.chore_assignments
for update
using (
  exists (
    select 1
    from public.chores c
    where c.id = chore_assignments.chore_id
      and public.is_family_member(c.family_id)
  )
)
with check (
  exists (
    select 1
    from public.chores c
    where c.id = chore_assignments.chore_id
      and public.is_family_member(c.family_id)
  )
);

drop policy if exists "chore_assignments_delete_member" on public.chore_assignments;
create policy "chore_assignments_delete_member"
on public.chore_assignments
for delete
using (
  exists (
    select 1
    from public.chores c
    where c.id = chore_assignments.chore_id
      and public.is_family_member(c.family_id)
  )
);

drop policy if exists "chore_instances_select_member" on public.chore_instances;
create policy "chore_instances_select_member"
on public.chore_instances
for select
using (public.is_family_member(family_id));

drop policy if exists "chore_instances_insert_member" on public.chore_instances;
create policy "chore_instances_insert_member"
on public.chore_instances
for insert
with check (public.is_family_member(family_id));

drop policy if exists "chore_instances_update_member" on public.chore_instances;
create policy "chore_instances_update_member"
on public.chore_instances
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

drop policy if exists "chore_instances_delete_member" on public.chore_instances;
create policy "chore_instances_delete_member"
on public.chore_instances
for delete
using (public.is_family_member(family_id));

drop policy if exists "points_transactions_select_member" on public.points_transactions;
create policy "points_transactions_select_member"
on public.points_transactions
for select
using (public.is_family_member(family_id));

drop policy if exists "points_transactions_insert_member" on public.points_transactions;
create policy "points_transactions_insert_member"
on public.points_transactions
for insert
with check (public.is_family_member(family_id));

drop policy if exists "rewards_select_member" on public.rewards;
create policy "rewards_select_member"
on public.rewards
for select
using (public.is_family_member(family_id));

drop policy if exists "rewards_insert_member" on public.rewards;
create policy "rewards_insert_member"
on public.rewards
for insert
with check (public.is_family_member(family_id));

drop policy if exists "rewards_update_member" on public.rewards;
create policy "rewards_update_member"
on public.rewards
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

drop policy if exists "rewards_delete_member" on public.rewards;
create policy "rewards_delete_member"
on public.rewards
for delete
using (public.is_family_member(family_id));

drop policy if exists "reward_redemptions_select_member" on public.reward_redemptions;
create policy "reward_redemptions_select_member"
on public.reward_redemptions
for select
using (public.is_family_member(family_id));

drop policy if exists "reward_redemptions_insert_member" on public.reward_redemptions;
create policy "reward_redemptions_insert_member"
on public.reward_redemptions
for insert
with check (public.is_family_member(family_id));

drop policy if exists "reward_redemptions_update_member" on public.reward_redemptions;
create policy "reward_redemptions_update_member"
on public.reward_redemptions
for update
using (public.is_family_member(family_id))
with check (public.is_family_member(family_id));

drop policy if exists "reward_redemptions_delete_member" on public.reward_redemptions;
create policy "reward_redemptions_delete_member"
on public.reward_redemptions
for delete
using (public.is_family_member(family_id));

drop policy if exists "streaks_select_member" on public.streaks;
create policy "streaks_select_member"
on public.streaks
for select
using (
  exists (
    select 1
    from public.kids k
    where k.id = streaks.kid_id
      and public.is_family_member(k.family_id)
  )
);

drop policy if exists "streaks_insert_member" on public.streaks;
create policy "streaks_insert_member"
on public.streaks
for insert
with check (
  exists (
    select 1
    from public.kids k
    where k.id = streaks.kid_id
      and public.is_family_member(k.family_id)
  )
);

drop policy if exists "streaks_update_member" on public.streaks;
create policy "streaks_update_member"
on public.streaks
for update
using (
  exists (
    select 1
    from public.kids k
    where k.id = streaks.kid_id
      and public.is_family_member(k.family_id)
  )
)
with check (
  exists (
    select 1
    from public.kids k
    where k.id = streaks.kid_id
      and public.is_family_member(k.family_id)
  )
);

drop policy if exists "streaks_delete_member" on public.streaks;
create policy "streaks_delete_member"
on public.streaks
for delete
using (
  exists (
    select 1
    from public.kids k
    where k.id = streaks.kid_id
      and public.is_family_member(k.family_id)
  )
);

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
on public.push_tokens
for select
using (profile_id = auth.uid());

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
on public.push_tokens
for insert
with check (profile_id = auth.uid());

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
on public.push_tokens
for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
on public.push_tokens
for delete
using (profile_id = auth.uid());
