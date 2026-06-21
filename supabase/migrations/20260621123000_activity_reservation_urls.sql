alter table public.activities
add column if not exists reservation_url text;

do $$
begin
  if to_regprocedure('public.duplicate_trip_base(uuid,text)') is null
    and to_regprocedure('public.duplicate_trip(uuid,text)') is not null then
    alter function public.duplicate_trip(uuid, text) rename to duplicate_trip_base;
  end if;
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
  new_trip_id uuid;
begin
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
end;
$$;

revoke all on function public.duplicate_trip_base(uuid, text) from public;
revoke all on function public.duplicate_trip(uuid, text) from public;
grant execute on function public.duplicate_trip(uuid, text) to authenticated;
