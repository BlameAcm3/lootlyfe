-- Allow family creators to pass is_family_member() when a family_members row is missing
-- (e.g. failed upsert, manual DB drift). Matches families SELECT: member OR created_by.

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
  )
  or exists (
    select 1
    from public.families f
    where f.id = target_family_id
      and f.created_by = auth.uid()
  );
$$;
