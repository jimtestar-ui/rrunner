alter table public.destinations
add column if not exists source_local_id text;

create unique index if not exists destinations_user_source_local_unique
on public.destinations (user_id, source_local_id);
