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

alter table public.restaurants enable row level security;

create policy "restaurants_select"
on public.restaurants for select
using (public.can_read_trip(trip_id));

create policy "restaurants_insert"
on public.restaurants for insert
with check (public.can_edit_trip(trip_id));

create policy "restaurants_update"
on public.restaurants for update
using (public.can_edit_trip(trip_id))
with check (public.can_edit_trip(trip_id));

create policy "restaurants_delete"
on public.restaurants for delete
using (public.can_edit_trip(trip_id));
