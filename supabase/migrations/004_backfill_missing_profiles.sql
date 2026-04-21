-- Users without a profiles row cannot insert into families (FK: families.created_by -> profiles.id).
insert into public.profiles (id, display_name, timezone)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'display_name', split_part(coalesce(u.email, 'user'), '@', 1)),
  'UTC'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
