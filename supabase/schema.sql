create extension if not exists pgcrypto;
create extension if not exists citext;

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
  is_public boolean not null default false,
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

create index if not exists trips_public_start_date_idx
on public.trips (start_date desc)
where is_public = true;

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

create table if not exists public.trip_invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  email citext not null,
  role public.trip_role not null default 'reader' check (role <> 'owner'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by uuid references public.profiles(id) on delete set null,
  accepted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (trip_id, email)
);

create index if not exists trip_invitations_email_status_idx
on public.trip_invitations (email, status);

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
  pickup_google_maps_url text,
  dropoff_google_maps_url text,
  condition_photo_urls text[] not null default '{}',
  notes text
);

create table if not exists public.accommodations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  type text not null,
  name text not null,
  address text not null,
  google_maps_url text,
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
  google_maps_url text,
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
  google_maps_url text,
  reservation_url text,
  cost jsonb not null default '{"amount":0,"currency":"EUR","conversionRate":1}',
  booking_reference text,
  payment_status text not null default 'pendiente',
  notes text
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_id uuid not null references public.itinerary_days(id) on delete cascade,
  name text not null,
  cuisine text,
  location text not null,
  google_maps_url text,
  average_price jsonb not null default '{"amount":0,"currency":"EUR","conversionRate":1}',
  has_reservation boolean not null default false,
  reservation_at timestamptz,
  booking_reference text,
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
  google_maps_url text,
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

create or replace function public.is_trip_public(target_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.trips
    where id = target_trip_id
      and is_public = true
  )
$$;

create or replace function public.can_edit_trip(target_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.trip_role_rank(public.get_trip_role(target_trip_id)), 0) >= 2
$$;

create or replace function public.can_manage_trip(target_trip_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.trip_role_rank(public.get_trip_role(target_trip_id)), 0) >= 3
$$;

create or replace function public.can_manage_member_role(target_trip_id uuid, target_role public.trip_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.get_trip_role(target_trip_id)
    when 'owner' then true
    when 'admin' then target_role in ('reader'::public.trip_role, 'editor'::public.trip_role)
    else false
  end
$$;

create or replace function public.can_manage_invitation_role(target_trip_id uuid, target_role public.trip_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_role <> 'owner'::public.trip_role
    and public.can_manage_member_role(target_trip_id, target_role)
$$;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_invitations enable row level security;

create policy "profiles_select_own" on public.profiles for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid());

create policy "trips_select_member" on public.trips for select using (public.can_read_trip(id));
create policy "trips_select_public" on public.trips for select using (is_public = true);
create policy "trips_insert_owner" on public.trips for insert with check (owner_id = auth.uid());
create policy "trips_update_editor" on public.trips for update using (public.can_edit_trip(id)) with check (public.can_edit_trip(id));
create policy "trips_delete_owner" on public.trips for delete using (owner_id = auth.uid());

create policy "members_select_member" on public.trip_members for select using (public.can_read_trip(trip_id));
create policy "members_insert_admin" on public.trip_members for insert with check (public.can_manage_member_role(trip_id, role));
create policy "members_update_admin" on public.trip_members for update using (public.can_manage_member_role(trip_id, role)) with check (public.can_manage_member_role(trip_id, role));
create policy "members_delete_admin" on public.trip_members for delete using (public.can_manage_member_role(trip_id, role));

create policy "invitations_select_authorized"
on public.trip_invitations for select
using (
  public.can_read_trip(trip_id)
  or email = lower(coalesce(auth.jwt() ->> 'email', ''))::citext
);

create policy "invitations_insert_admin"
on public.trip_invitations for insert
with check (
  status = 'pending'
  and public.can_manage_invitation_role(trip_id, role)
);

create policy "invitations_update_admin"
on public.trip_invitations for update
using (public.can_manage_invitation_role(trip_id, role))
with check (public.can_manage_invitation_role(trip_id, role));

create policy "invitations_delete_admin"
on public.trip_invitations for delete
using (public.can_manage_invitation_role(trip_id, role));

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
    'restaurants',
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

create policy "itinerary_days_public_select"
on public.itinerary_days for select
using (public.is_trip_public(trip_id));

create policy "itinerary_items_public_select"
on public.itinerary_items for select
using (public.is_trip_public(trip_id));

create policy "restaurants_public_select"
on public.restaurants for select
using (public.is_trip_public(trip_id));

create or replace function public.invite_trip_member(
  target_trip_id uuid,
  invite_email text,
  invite_role public.trip_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email citext := lower(trim(invite_email))::citext;
  target_profile public.profiles%rowtype;
  existing_member_role public.trip_role;
  existing_invitation_role public.trip_role;
begin
  if auth.uid() is null then
    raise exception 'Usuario no autenticado';
  end if;

  if normalized_email is null or normalized_email::text !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Email invalido';
  end if;

  if invite_role = 'owner'::public.trip_role then
    raise exception 'No se puede invitar como propietario';
  end if;

  if not public.can_manage_invitation_role(target_trip_id, invite_role) then
    raise exception 'No tienes permisos para asignar ese rol';
  end if;

  select role
  into existing_invitation_role
  from public.trip_invitations
  where trip_id = target_trip_id and email = normalized_email
  limit 1;

  if existing_invitation_role is not null
    and not public.can_manage_invitation_role(target_trip_id, existing_invitation_role) then
    raise exception 'No tienes permisos para modificar esta invitacion';
  end if;

  select *
  into target_profile
  from public.profiles
  where lower(email) = normalized_email::text
  limit 1;

  if target_profile.id is not null then
    select role
    into existing_member_role
    from public.trip_members
    where trip_id = target_trip_id and user_id = target_profile.id
    limit 1;

    if existing_member_role is not null
      and not public.can_manage_member_role(target_trip_id, existing_member_role) then
      raise exception 'No tienes permisos para modificar ese miembro';
    end if;

    insert into public.trip_members (trip_id, user_id, name, email, role)
    values (target_trip_id, target_profile.id, target_profile.name, target_profile.email, invite_role)
    on conflict (trip_id, user_id) do update
    set name = excluded.name,
        email = excluded.email,
        role = excluded.role;

    update public.trip_invitations
    set status = 'accepted',
        accepted_by = target_profile.id,
        accepted_at = now()
    where trip_id = target_trip_id
      and email = normalized_email
      and status = 'pending';
  else
    insert into public.trip_invitations (trip_id, email, role, invited_by, status)
    values (target_trip_id, normalized_email, invite_role, auth.uid(), 'pending')
    on conflict (trip_id, email) do update
    set role = excluded.role,
        invited_by = excluded.invited_by,
        status = 'pending',
        accepted_by = null,
        accepted_at = null,
        created_at = now();
  end if;

  update public.trips
  set updated_at = now()
  where id = target_trip_id;
end;
$$;

create or replace function public.claim_trip_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_id uuid := auth.uid();
  requester_email citext := lower(coalesce(auth.jwt() ->> 'email', ''))::citext;
  profile_name text;
  claimed_count integer := 0;
begin
  if requester_id is null or requester_email is null or requester_email = ''::citext then
    return 0;
  end if;

  select name
  into profile_name
  from public.profiles
  where id = requester_id;

  insert into public.trip_members (trip_id, user_id, name, email, role)
  select invitation.trip_id,
         requester_id,
         coalesce(profile_name, requester_email::text),
         requester_email::text,
         invitation.role
  from public.trip_invitations invitation
  where invitation.status = 'pending'
    and invitation.email = requester_email
  on conflict (trip_id, user_id) do update
  set name = excluded.name,
      email = excluded.email,
      role = case
        when public.trip_role_rank(public.trip_members.role) < public.trip_role_rank(excluded.role)
          then excluded.role
        else public.trip_members.role
      end;

  get diagnostics claimed_count = row_count;

  update public.trip_invitations
  set status = 'accepted',
      accepted_by = requester_id,
      accepted_at = now()
  where status = 'pending'
    and email = requester_email;

  return claimed_count;
end;
$$;

create or replace function public.duplicate_trip(
  source_trip_id uuid,
  duplicate_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_id uuid := auth.uid();
  requester_profile public.profiles%rowtype;
  source_trip public.trips%rowtype;
  source_day public.itinerary_days%rowtype;
  new_trip_id uuid := gen_random_uuid();
  new_day_id uuid;
  day_id_map jsonb := '{}'::jsonb;
  has_private_access boolean := public.can_read_trip(source_trip_id);
  can_copy_private_details boolean := false;
begin
  if requester_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not has_private_access and not public.is_trip_public(source_trip_id) then
    raise exception 'No tienes permisos para leer este viaje';
  end if;

  select *
  into source_trip
  from public.trips
  where id = source_trip_id;

  if source_trip.id is null then
    raise exception 'Viaje no encontrado';
  end if;

  can_copy_private_details := has_private_access and not source_trip.is_public;

  select *
  into requester_profile
  from public.profiles
  where id = requester_id;

  if requester_profile.id is null then
    raise exception 'Perfil no encontrado';
  end if;

  insert into public.trips (
    id,
    owner_id,
    title,
    status,
    is_public,
    destinations,
    start_date,
    end_date,
    cover_image_url,
    companions,
    budget_amount,
    base_currency,
    tags,
    notes,
    created_at,
    updated_at
  )
  values (
    new_trip_id,
    requester_id,
    coalesce(nullif(trim(duplicate_title), ''), source_trip.title || ' (copia)'),
    source_trip.status,
    false,
    source_trip.destinations,
    source_trip.start_date,
    source_trip.end_date,
    source_trip.cover_image_url,
    source_trip.companions,
    source_trip.budget_amount,
    source_trip.base_currency,
    source_trip.tags,
    source_trip.notes,
    now(),
    now()
  );

  insert into public.trip_members (trip_id, user_id, name, email, role)
  values (new_trip_id, requester_id, requester_profile.name, requester_profile.email, 'owner');

  if can_copy_private_details then
  insert into public.flights (
    id,
    trip_id,
    leg_type,
    is_international,
    company,
    flight_number,
    origin_airport,
    destination_airport,
    departure_at,
    arrival_at,
    terminal,
    seat,
    booking_reference,
    cost,
    baggage,
    priority_boarding,
    extras,
    notes
  )
  select
    gen_random_uuid(),
    new_trip_id,
    leg_type,
    is_international,
    company,
    flight_number,
    origin_airport,
    destination_airport,
    departure_at,
    arrival_at,
    terminal,
    seat,
    booking_reference,
    cost,
    baggage,
    priority_boarding,
    extras,
    notes
  from public.flights
  where trip_id = source_trip_id;

  insert into public.vehicle_rentals (
    id,
    trip_id,
    company,
    brand,
    model,
    license_plate,
    fuel_policy,
    insurance,
    deductible,
    included_mileage,
    deposit,
    main_driver,
    price,
    pickup_point,
    dropoff_point,
    pickup_at,
    dropoff_at,
    pickup_latitude,
    pickup_longitude,
    dropoff_latitude,
    dropoff_longitude,
    pickup_google_maps_url,
    dropoff_google_maps_url,
    condition_photo_urls,
    notes
  )
  select
    gen_random_uuid(),
    new_trip_id,
    company,
    brand,
    model,
    license_plate,
    fuel_policy,
    insurance,
    deductible,
    included_mileage,
    deposit,
    main_driver,
    price,
    pickup_point,
    dropoff_point,
    pickup_at,
    dropoff_at,
    pickup_latitude,
    pickup_longitude,
    dropoff_latitude,
    dropoff_longitude,
    pickup_google_maps_url,
    dropoff_google_maps_url,
    condition_photo_urls,
    notes
  from public.vehicle_rentals
  where trip_id = source_trip_id;

  insert into public.accommodations (
    id,
    trip_id,
    type,
    name,
    address,
    google_maps_url,
    booking_reference,
    board_basis,
    check_in_at,
    check_out_at,
    cost,
    tourist_tax,
    deposit,
    contact_name,
    contact_phone,
    services,
    hotel_activities,
    guests,
    room,
    cancellation_policy,
    notes
  )
  select
    gen_random_uuid(),
    new_trip_id,
    type,
    name,
    address,
    google_maps_url,
    booking_reference,
    board_basis,
    check_in_at,
    check_out_at,
    cost,
    tourist_tax,
    deposit,
    contact_name,
    contact_phone,
    services,
    hotel_activities,
    guests,
    room,
    cancellation_policy,
    notes
  from public.accommodations
  where trip_id = source_trip_id;
  end if;

  for source_day in
    select *
    from public.itinerary_days
    where trip_id = source_trip_id
    order by date, title
  loop
    new_day_id := gen_random_uuid();

    insert into public.itinerary_days (id, trip_id, date, title, notes)
    values (new_day_id, new_trip_id, source_day.date, source_day.title, source_day.notes);

    day_id_map := day_id_map || jsonb_build_object(source_day.id::text, new_day_id::text);
  end loop;

  insert into public.itinerary_items (
    id,
    trip_id,
    day_id,
    title,
    description,
    image_url,
    google_maps_url,
    cost,
    latitude,
    longitude,
    recommendations,
    visited,
    sort_order
  )
  select
    gen_random_uuid(),
    new_trip_id,
    (day_id_map ->> day_id::text)::uuid,
    title,
    description,
    image_url,
    google_maps_url,
    cost,
    latitude,
    longitude,
    recommendations,
    visited,
    sort_order
  from public.itinerary_items
  where trip_id = source_trip_id
  order by sort_order;

  insert into public.restaurants (
    id,
    trip_id,
    day_id,
    name,
    cuisine,
    location,
    google_maps_url,
    average_price,
    has_reservation,
    reservation_at,
    booking_reference,
    notes
  )
  select
    gen_random_uuid(),
    new_trip_id,
    (day_id_map ->> day_id::text)::uuid,
    name,
    cuisine,
    location,
    google_maps_url,
    average_price,
    has_reservation,
    reservation_at,
    booking_reference,
    notes
  from public.restaurants
  where trip_id = source_trip_id
  order by reservation_at nulls last, name;

  if can_copy_private_details then
  insert into public.activities (
    id,
    trip_id,
    day_id,
    name,
    provider,
    starts_at,
    location,
    google_maps_url,
    reservation_url,
    cost,
    booking_reference,
    payment_status,
    notes
  )
  select
    gen_random_uuid(),
    new_trip_id,
    case when day_id is null then null else (day_id_map ->> day_id::text)::uuid end,
    name,
    provider,
    starts_at,
    location,
    google_maps_url,
    reservation_url,
    cost,
    booking_reference,
    payment_status,
    notes
  from public.activities
  where trip_id = source_trip_id
  order by starts_at nulls last, name;

  insert into public.contacts (
    id,
    trip_id,
    category,
    name,
    phone,
    email,
    address,
    google_maps_url,
    notes
  )
  select
    gen_random_uuid(),
    new_trip_id,
    category,
    name,
    phone,
    email,
    address,
    google_maps_url,
    notes
  from public.contacts
  where trip_id = source_trip_id;

  insert into public.insurances (
    id,
    trip_id,
    provider,
    policy_number,
    contact_phone,
    contact_email,
    cost,
    coverage_summary,
    document_url,
    notes
  )
  select
    gen_random_uuid(),
    new_trip_id,
    provider,
    policy_number,
    contact_phone,
    contact_email,
    cost,
    coverage_summary,
    document_url,
    notes
  from public.insurances
  where trip_id = source_trip_id;

  insert into public.documents (
    id,
    trip_id,
    category,
    title,
    file_url,
    related_to,
    notes
  )
  select
    gen_random_uuid(),
    new_trip_id,
    category,
    title,
    file_url,
    related_to,
    notes
  from public.documents
  where trip_id = source_trip_id;

  insert into public.journal_entries (
    id,
    trip_id,
    date,
    title,
    body,
    photo_urls,
    mood
  )
  select
    gen_random_uuid(),
    new_trip_id,
    date,
    title,
    body,
    photo_urls,
    mood
  from public.journal_entries
  where trip_id = source_trip_id
  order by date, title;

  insert into public.expenses (
    id,
    trip_id,
    category,
    description,
    date,
    cost,
    paid
  )
  select
    gen_random_uuid(),
    new_trip_id,
    category,
    description,
    date,
    cost,
    paid
  from public.expenses
  where trip_id = source_trip_id
  order by date nulls last, description;
  end if;

  return new_trip_id;
end;
$$;

revoke all on function public.invite_trip_member(uuid, text, public.trip_role) from public;
grant execute on function public.invite_trip_member(uuid, text, public.trip_role) to authenticated;

revoke all on function public.claim_trip_invitations() from public;
grant execute on function public.claim_trip_invitations() to authenticated;

revoke all on function public.duplicate_trip(uuid, text) from public;
grant execute on function public.duplicate_trip(uuid, text) to authenticated;

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
