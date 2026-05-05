drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can add own free profile"
on public.profiles for insert
to authenticated
with check (
  auth.uid() = id
  and plan_type = 'FREE'
  and location_limit = 2
  and is_admin = false
);

create policy "Users can update own basic profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and plan_type = 'FREE'
  and location_limit = 2
  and is_admin = false
);
