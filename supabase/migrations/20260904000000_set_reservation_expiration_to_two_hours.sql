begin;

alter table public.raffles
alter column reservation_duration_minutes set default 120;

update public.raffles
set reservation_duration_minutes = 120;

update public.reservations
set expires_at =
  coalesce(submitted_at, created_at) + interval '2 hours'
where status in ('held', 'pending');

update public.raffle_numbers
set reserved_until = reservations.expires_at
from public.reservations
where reservations.id = raffle_numbers.current_reservation_id
  and reservations.status in ('held', 'pending');

create or replace function public.release_expired_reservations(
  p_raffle_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_released_count integer;
begin
  with expired_reservations as (
    select reservations.id
    from public.reservations
    where reservations.status in ('held', 'pending')
      and reservations.expires_at is not null
      and reservations.expires_at <= now()
      and (
        p_raffle_id is null
        or reservations.raffle_id = p_raffle_id
      )
    for update
  ),
  released_numbers as (
    update public.raffle_numbers
    set
      status = 'available',
      current_reservation_id = null,
      reserved_until = null
    where current_reservation_id in (
      select id
      from expired_reservations
    )
    returning id
  ),
  updated_reservations as (
    update public.reservations
    set
      status = 'expired',
      expires_at = null
    where id in (
      select id
      from expired_reservations
    )
    returning id
  )
  select count(*)
  into v_released_count
  from updated_reservations;

  return v_released_count;
end;
$$;

create or replace function public.submit_raffle_reservation(
  p_lookup_token uuid,
  p_storage_path text default null,
  p_original_filename text default null,
  p_mime_type text default null,
  p_size_bytes bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reservation public.reservations%rowtype;
  v_duration_minutes smallint;
  v_expires_at timestamptz;
begin
  select *
  into v_reservation
  from public.reservations
  where lookup_token = p_lookup_token
  for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  if v_reservation.status <> 'held' then
    raise exception
      'The reservation is not awaiting submission';
  end if;

  if v_reservation.expires_at <= now() then
    update public.raffle_numbers
    set
      status = 'available',
      current_reservation_id = null,
      reserved_until = null
    where current_reservation_id = v_reservation.id;

    update public.reservations
    set
      status = 'expired',
      expires_at = null
    where id = v_reservation.id;

    return jsonb_build_object(
      'reservationId', v_reservation.id,
      'status', 'expired'
    );
  end if;

  if v_reservation.payment_method = 'transfer' then
    if nullif(trim(p_storage_path), '') is null
      or nullif(trim(p_original_filename), '') is null
      or nullif(trim(p_mime_type), '') is null
      or p_size_bytes is null
    then
      raise exception
        'A payment proof is required for bank transfers';
    end if;

    if p_size_bytes <= 0 or p_size_bytes > 5242880 then
      raise exception
        'The payment proof must be no larger than 5 MB';
    end if;

    if p_mime_type not in (
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ) then
      raise exception 'Unsupported payment proof file type';
    end if;

    insert into public.payment_proofs (
      reservation_id,
      storage_path,
      original_filename,
      mime_type,
      size_bytes
    )
    values (
      v_reservation.id,
      trim(p_storage_path),
      trim(p_original_filename),
      trim(p_mime_type),
      p_size_bytes
    );
  end if;

  select raffles.reservation_duration_minutes
  into v_duration_minutes
  from public.raffles
  where raffles.id = v_reservation.raffle_id;

  if not found then
    raise exception 'The raffle does not exist';
  end if;

  v_expires_at :=
    now() + make_interval(mins => v_duration_minutes);

  update public.reservations
  set
    status = 'pending',
    submitted_at = now(),
    expires_at = v_expires_at
  where id = v_reservation.id;

  update public.raffle_numbers
  set
    status = 'pending',
    reserved_until = v_expires_at
  where current_reservation_id = v_reservation.id;

  return jsonb_build_object(
    'reservationId', v_reservation.id,
    'status', 'pending',
    'expiresAt', v_expires_at
  );
end;
$$;

create or replace function public.confirm_raffle_reservation(
  p_reservation_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status public.reservation_status;
begin
  select status
  into v_status
  from public.reservations
  where id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation not found';
  end if;

  if v_status <> 'pending' then
    raise exception
      'Only pending reservations can be confirmed';
  end if;

  update public.reservations
  set
    status = 'paid',
    confirmed_at = now(),
    expires_at = null,
    rejection_reason = null
  where id = p_reservation_id;

  update public.raffle_numbers
  set
    status = 'paid',
    reserved_until = null
  where current_reservation_id = p_reservation_id;

  return jsonb_build_object(
    'reservationId', p_reservation_id,
    'status', 'paid'
  );
end;
$$;

drop index if exists public.reservations_expiration_idx;

create index reservations_expiration_idx
on public.reservations (expires_at)
where status in ('held', 'pending')
  and expires_at is not null;

revoke execute
on function public.release_expired_reservations(uuid)
from public, anon, authenticated;

revoke execute
on function public.submit_raffle_reservation(
  uuid,
  text,
  text,
  text,
  bigint
)
from public, anon, authenticated;

revoke execute
on function public.confirm_raffle_reservation(uuid)
from public, anon, authenticated;

grant execute
on function public.release_expired_reservations(uuid)
to service_role;

grant execute
on function public.submit_raffle_reservation(
  uuid,
  text,
  text,
  text,
  bigint
)
to service_role;

grant execute
on function public.confirm_raffle_reservation(uuid)
to service_role;

commit;
