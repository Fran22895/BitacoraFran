create extension if not exists citext;

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

drop policy if exists "members_insert_admin" on public.trip_members;
drop policy if exists "members_update_admin" on public.trip_members;
drop policy if exists "members_delete_admin" on public.trip_members;

create policy "members_insert_admin"
on public.trip_members for insert
with check (public.can_manage_member_role(trip_id, role));

create policy "members_update_admin"
on public.trip_members for update
using (public.can_manage_member_role(trip_id, role))
with check (public.can_manage_member_role(trip_id, role));

create policy "members_delete_admin"
on public.trip_members for delete
using (public.can_manage_member_role(trip_id, role));

alter table public.trip_invitations enable row level security;

drop policy if exists "invitations_select_authorized" on public.trip_invitations;
drop policy if exists "invitations_insert_admin" on public.trip_invitations;
drop policy if exists "invitations_update_admin" on public.trip_invitations;
drop policy if exists "invitations_delete_admin" on public.trip_invitations;

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

revoke all on function public.invite_trip_member(uuid, text, public.trip_role) from public;
grant execute on function public.invite_trip_member(uuid, text, public.trip_role) to authenticated;

revoke all on function public.claim_trip_invitations() from public;
grant execute on function public.claim_trip_invitations() to authenticated;
