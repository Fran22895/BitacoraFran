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
begin
  if requester_id is null then
    raise exception 'Usuario no autenticado';
  end if;

  if not public.can_read_trip(source_trip_id) then
    raise exception 'No tienes permisos para leer este viaje';
  end if;

  select *
  into source_trip
  from public.trips
  where id = source_trip_id;

  if source_trip.id is null then
    raise exception 'Viaje no encontrado';
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

  return new_trip_id;
end;
$$;

revoke all on function public.duplicate_trip(uuid, text) from public;
grant execute on function public.duplicate_trip(uuid, text) to authenticated;
