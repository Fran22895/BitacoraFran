drop policy if exists "restaurants_public_select" on public.restaurants;
create policy "restaurants_public_select"
on public.restaurants for select
using (public.is_trip_public(trip_id));

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
begin
  if requester_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  select *
  into source_trip
  from public.trips
  where id = source_trip_id;

  if source_trip.id is null then
    raise exception 'Viaje no encontrado';
  end if;

  if not has_private_access and not source_trip.is_public then
    raise exception 'No tienes permisos para leer este viaje';
  end if;

  if not source_trip.is_public then
    new_trip_id := public.duplicate_trip_base(source_trip_id, duplicate_title);

    update public.activities target_activity
    set reservation_url = source_activity.reservation_url
    from public.activities source_activity
    where source_activity.trip_id = source_trip_id
      and target_activity.trip_id = new_trip_id
      and target_activity.name = source_activity.name
      and target_activity.starts_at is not distinct from source_activity.starts_at
      and target_activity.location is not distinct from source_activity.location;

    return new_trip_id;
  end if;

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

  return new_trip_id;
end;
$$;

revoke all on function public.duplicate_trip(uuid, text) from public;
grant execute on function public.duplicate_trip(uuid, text) to authenticated;
