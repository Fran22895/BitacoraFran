create extension if not exists pgcrypto;

create type public.trip_status as enum ('planned', 'active', 'completed', 'cancelled');
create type public.trip_role as enum ('owner', 'admin', 'editor', 'reader');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  status public.trip_status not null default 'planned',
  destinations text[] not null default '{}',
  start_date date not null,
  end_date date not null,
  cover_image_url text,
  companions text[] not null default '{}',
  budget_amount numeric(12,2) not null default 0,
  base_currency char(3) not null default 'EUR',
  tags text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  email text not null,
  role public.trip_role not null default 'reader',
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create table if not exists public.trip_destinations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  country text,
  start_date date,
  end_date date,
  sort_order integer not null default 1
);

create table if not exists public.flights (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  leg_type text not null,
  is_international boolean not null default false,
  company text not null,
  flight_number text not null,
  origin_airport text not null,
  destination_airport text not null,
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  terminal text,
  seat text,
  booking_reference text,
  cost jsonb not null default '{"amount":0,"currency":"EUR","conversionRate":1}',
  baggage jsonb not null default '{}',
  priority_boarding boolean not null default false,
  extras text[] not null default '{}',
  notes text
);

create table if not exists public.vehicle_rentals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  company text not null,
  brand text not null,
  model text not null,
  license_plate text,
  fuel_policy text,
  insurance text,
  deductible jsonb,
  included_mileage text,
  deposit jsonb,
  main_driver text,
  price jsonb not null default '{"amount":0,"currency":"EUR","conversionRate":1}',
  pickup_point text not null,
  dropoff_point text not null,
  pickup_at timestamptz,
  dropoff_at timestamptz,
  pickup_latitude numeric,
  pickup_longitude numeric,
  dropoff_latitude numeric,
  dropoff_longitude numeric,
  condition_photo_urls text[] not null default '{}',
  notes text
);

create table if not exists public.accommodations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  type text not null,
  name text not null,
  address text not null,
  booking_reference text,
  board_basis text,
  check_in_at timestamptz,
  check_out_at timestamptz,
  cost jsonb not null default '{"amount":0,"currency":"EUR","conversionRate":1}',
  tourist_tax jsonb,
  deposit jsonb,
  contact_name text,
  contact_phone text,
  services text,
  hotel_activities text,
  guests text,
  room text,
  cancellation_policy text,
  notes text
);

create table if not exists public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  date date not null,
  title text not null,
  notes text
);

create table if not exists public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_id uuid references public.itinerary_days(id) on delete cascade,
  title text not null,
  description text not null,
  image_url text,
  cost jsonb,
  latitude numeric,
  longitude numeric,
  recommendations jsonb not null default '{}',
  visited boolean not null default false,
  sort_order integer not null default 1
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_id uuid references public.itinerary_days(id) on delete set null,
  name text not null,
  provider text,
  starts_at timestamptz,
  location text,
  cost jsonb not null default '{"amount":0,"currency":"EUR","conversionRate":1}',
  booking_reference text,
  payment_status text not null default 'pendiente',
  notes text
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null,
  name text not null,
  phone text not null,
  email text,
  address text,
  notes text
);

create table if not exists public.insurances (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  provider text not null,
  policy_number text not null,
  contact_phone text,
  contact_email text,
  cost jsonb not null default '{"amount":0,"currency":"EUR","conversionRate":1}',
  coverage_summary text,
  document_url text,
  notes text
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null,
  title text not null,
  file_url text not null,
  related_to text,
  notes text
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  date date not null,
  title text not null,
  body text not null,
  photo_urls text[] not null default '{}',
  mood text
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null,
  description text not null,
  date date,
  cost jsonb not null default '{"amount":0,"currency":"EUR","conversionRate":1}',
  paid boolean not null default false
);

create or replace function public.trip_role_rank(role public.trip_role)
returns integer language sql immutable as $$
  select case role
    when 'owner' then 4
    when 'admin' then 3
    when 'editor' then 2
    when 'reader' then 1
  end
$$;

create or replace function public.get_trip_role(target_trip_id uuid)
returns public.trip_role
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1 from public.trips
      where id = target_trip_id and owner_id = auth.uid()
    ) then 'owner'::public.trip_role
    else (
      select role from public.trip_members
      where trip_id = target_trip_id and user_id = auth.uid()
      limit 1
    )
  end
$$;

create or replace function public.can_read_trip(target_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.get_trip_role(target_trip_id) is not null
$$;

create or replace function public.can_edit_trip(target_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.trip_role_rank(public.get_trip_role(target_trip_id)), 0) >= 2
$$;

create or replace function public.can_manage_trip(target_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.trip_role_rank(public.get_trip_role(target_trip_id)), 0) >= 3
$$;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());

create policy "trips_select_member" on public.trips for select using (public.can_read_trip(id));
create policy "trips_insert_owner" on public.trips for insert with check (owner_id = auth.uid());
create policy "trips_update_editor" on public.trips for update using (public.can_edit_trip(id)) with check (public.can_edit_trip(id));
create policy "trips_delete_owner" on public.trips for delete using (owner_id = auth.uid());

create policy "members_select_member" on public.trip_members for select using (public.can_read_trip(trip_id));
create policy "members_insert_admin" on public.trip_members for insert with check (public.can_manage_trip(trip_id));
create policy "members_update_admin" on public.trip_members for update using (public.can_manage_trip(trip_id)) with check (public.can_manage_trip(trip_id));
create policy "members_delete_admin" on public.trip_members for delete using (public.can_manage_trip(trip_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'trip_destinations',
    'flights',
    'vehicle_rentals',
    'accommodations',
    'itinerary_days',
    'itinerary_items',
    'activities',
    'contacts',
    'insurances',
    'documents',
    'journal_entries',
    'expenses'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select using (public.can_read_trip(trip_id))', table_name || '_select', table_name);
    execute format('create policy %I on public.%I for insert with check (public.can_edit_trip(trip_id))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id))', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete using (public.can_edit_trip(trip_id))', table_name || '_delete', table_name);
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values ('trip-documents', 'trip-documents', false)
on conflict (id) do nothing;

create policy "trip_documents_storage_select"
on storage.objects for select
using (
  bucket_id = 'trip-documents'
  and public.can_read_trip((storage.foldername(name))[1]::uuid)
);

create policy "trip_documents_storage_write"
on storage.objects for insert
with check (
  bucket_id = 'trip-documents'
  and public.can_edit_trip((storage.foldername(name))[1]::uuid)
);

create policy "trip_documents_storage_update"
on storage.objects for update
using (
  bucket_id = 'trip-documents'
  and public.can_edit_trip((storage.foldername(name))[1]::uuid)
);

create policy "trip_documents_storage_delete"
on storage.objects for delete
using (
  bucket_id = 'trip-documents'
  and public.can_edit_trip((storage.foldername(name))[1]::uuid)
);
