create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan_type text not null default 'FREE' check (plan_type in ('FREE', 'PRO', 'BETA', 'LIFETIME')),
  location_limit integer not null default 2,
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  nickname text not null,
  address text not null,
  place_id text,
  latitude double precision,
  longitude double precision,
  card_color text not null default '#0b9db9',
  is_priority boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.plan_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_type text not null check (plan_type in ('FREE', 'PRO', 'BETA', 'LIFETIME')),
  location_limit integer not null,
  note text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  percent_off integer check (percent_off between 1 and 100),
  amount_off_cents integer check (amount_off_cents > 0),
  plan_type text not null default 'PRO' check (plan_type in ('PRO', 'BETA', 'LIFETIME')),
  max_redemptions integer,
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  check (percent_off is not null or amount_off_cents is not null)
);

create table if not exists public.discount_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_code_id uuid not null references public.discount_codes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (discount_code_id, user_id)
);

alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.plan_overrides enable row level security;
alter table public.discount_codes enable row level security;
alter table public.discount_redemptions enable row level security;

create policy "Users can read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id and is_admin = false);

create policy "Users can read own destinations"
on public.destinations for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can add own destinations"
on public.destinations for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own destinations"
on public.destinations for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own destinations"
on public.destinations for delete
to authenticated
using (auth.uid() = user_id);

create policy "Users can read own plan overrides"
on public.plan_overrides for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can read active discount codes"
on public.discount_codes for select
to authenticated
using (active = true and starts_at <= now() and (ends_at is null or ends_at > now()));

create policy "Users can read own discount redemptions"
on public.discount_redemptions for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can create own discount redemptions"
on public.discount_redemptions for insert
to authenticated
with check (auth.uid() = user_id);
