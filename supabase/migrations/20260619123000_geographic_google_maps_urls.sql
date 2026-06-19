alter table public.vehicle_rentals
add column if not exists pickup_google_maps_url text,
add column if not exists dropoff_google_maps_url text;

alter table public.accommodations
add column if not exists google_maps_url text;

alter table public.itinerary_items
add column if not exists google_maps_url text;

alter table public.activities
add column if not exists google_maps_url text;

alter table public.contacts
add column if not exists google_maps_url text;
