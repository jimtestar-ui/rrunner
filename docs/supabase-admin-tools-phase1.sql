create schema if not exists private;

create or replace function private.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_admin = true
  );
$$;

revoke all on function private.current_user_is_admin() from public;
grant execute on function private.current_user_is_admin() to authenticated;

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles for select
to authenticated
using ((select private.current_user_is_admin()));

drop policy if exists "Admins can update account plans" on public.profiles;
create policy "Admins can update account plans"
on public.profiles for update
to authenticated
using ((select private.current_user_is_admin()))
with check ((select private.current_user_is_admin()));

-- Run this once with your owner email after the profile exists.
-- update public.profiles
-- set is_admin = true,
--     plan_type = 'PRO',
--     location_limit = 10
-- where lower(email) = lower('owner@example.com');
