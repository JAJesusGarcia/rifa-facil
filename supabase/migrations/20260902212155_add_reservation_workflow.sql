alter table public.raffles
add column max_numbers_per_reservation smallint not null default 2
check (max_numbers_per_reservation between 1 and 20);

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
    where reservations.status = 'held'
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
    set status = 'expired'
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

create or replace function public.create_raffle_hold(
  p_raffle_id uuid,
  p_numbers smallint[],
  p_customer_name text,
  p_customer_whatsapp text,
  p_payment_method public.payment_method
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_numbers smallint[];
  v_locked_numbers smallint[];
  v_number_count integer;
  v_number_price numeric(12, 2);
  v_bundle_quantity smallint;
  v_bundle_price numeric(12, 2);
  v_max_numbers smallint;
  v_duration_minutes smallint;
  v_total_amount numeric(12, 2);
  v_reservation_id uuid;
  v_lookup_token uuid;
  v_expires_at timestamptz;
begin
  if p_numbers is null or cardinality(p_numbers) = 0 then
    raise exception 'At least one raffle number must be selected';
  end if;

  if array_position(p_numbers, null) is not null then
    raise exception 'Raffle numbers cannot contain null values';
  end if;

  select array_agg(selected_number order by selected_number)
  into v_numbers
  from (
    select distinct unnest(p_numbers)::smallint as selected_number
  ) as unique_numbers;

  if cardinality(v_numbers) <> cardinality(p_numbers) then
    raise exception 'Duplicate raffle numbers are not allowed';
  end if;

  select
    raffles.number_price,
    raffles.bundle_quantity,
    raffles.bundle_price,
    raffles.max_numbers_per_reservation,
    raffles.reservation_duration_minutes
  into
    v_number_price,
    v_bundle_quantity,
    v_bundle_price,
    v_max_numbers,
    v_duration_minutes
  from public.raffles
  where raffles.id = p_raffle_id
    and raffles.status = 'active';

  if not found then
    raise exception 'The raffle does not exist or is not active';
  end if;

  v_number_count := cardinality(v_numbers);

  if v_number_count > v_max_numbers then
    raise exception
      'A maximum of % numbers can be reserved',
      v_max_numbers;
  end if;

  if char_length(trim(p_customer_name)) < 2 then
    raise exception 'A valid customer name is required';
  end if;

  if char_length(trim(p_customer_whatsapp)) < 6 then
    raise exception 'A valid WhatsApp number is required';
  end if;

  perform public.release_expired_reservations(p_raffle_id);

  select coalesce(
    array_agg(locked_number.number order by locked_number.number),
    '{}'::smallint[]
  )
  into v_locked_numbers
  from (
    select raffle_numbers.number
    from public.raffle_numbers
    where raffle_numbers.raffle_id = p_raffle_id
      and raffle_numbers.number = any(v_numbers)
      and raffle_numbers.status = 'available'
    order by raffle_numbers.number
    for update
  ) as locked_number;

  if cardinality(v_locked_numbers) <> v_number_count then
    raise exception
      'One or more selected numbers are no longer available';
  end if;

  v_total_amount :=
    (v_number_count / v_bundle_quantity) * v_bundle_price
    + mod(v_number_count, v_bundle_quantity) * v_number_price;

  v_expires_at :=
    now() + make_interval(mins => v_duration_minutes);

  insert into public.reservations (
    raffle_id,
    customer_name,
    customer_whatsapp,
    payment_method,
    status,
    total_amount,
    expires_at
  )
  values (
    p_raffle_id,
    trim(p_customer_name),
    trim(p_customer_whatsapp),
    p_payment_method,
    'held',
    v_total_amount,
    v_expires_at
  )
  returning
    id,
    lookup_token
  into
    v_reservation_id,
    v_lookup_token;

  insert into public.reservation_numbers (
    reservation_id,
    raffle_id,
    raffle_number_id,
    number
  )
  select
    v_reservation_id,
    p_raffle_id,
    raffle_numbers.id,
    raffle_numbers.number
  from public.raffle_numbers
  where raffle_numbers.raffle_id = p_raffle_id
    and raffle_numbers.number = any(v_numbers);

  update public.raffle_numbers
  set
    status = 'held',
    current_reservation_id = v_reservation_id,
    reserved_until = v_expires_at
  where raffle_id = p_raffle_id
    and number = any(v_numbers);

  return jsonb_build_object(
    'reservationId', v_reservation_id,
    'lookupToken', v_lookup_token,
    'numbers', v_numbers,
    'totalAmount', v_total_amount,
    'expiresAt', v_expires_at,
    'status', 'held'
  );
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
    set status = 'expired'
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

  update public.reservations
  set
    status = 'pending',
    submitted_at = now(),
    expires_at = null
  where id = v_reservation.id;

  update public.raffle_numbers
  set
    status = 'pending',
    reserved_until = null
  where current_reservation_id = v_reservation.id;

  return jsonb_build_object(
    'reservationId', v_reservation.id,
    'status', 'pending'
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

create or replace function public.reject_raffle_reservation(
  p_reservation_id uuid,
  p_reason text default null
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

  if v_status not in ('held', 'pending') then
    raise exception
      'Only held or pending reservations can be rejected';
  end if;

  update public.raffle_numbers
  set
    status = 'available',
    current_reservation_id = null,
    reserved_until = null
  where current_reservation_id = p_reservation_id;

  update public.reservations
  set
    status = 'rejected',
    expires_at = null,
    rejection_reason = nullif(trim(p_reason), '')
  where id = p_reservation_id;

  return jsonb_build_object(
    'reservationId', p_reservation_id,
    'status', 'rejected'
  );
end;
$$;

revoke execute
on function public.release_expired_reservations(uuid)
from public, anon, authenticated;

revoke execute
on function public.create_raffle_hold(
  uuid,
  smallint[],
  text,
  text,
  public.payment_method
)
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

revoke execute
on function public.reject_raffle_reservation(uuid, text)
from public, anon, authenticated;

grant execute
on function public.release_expired_reservations(uuid)
to service_role;

grant execute
on function public.create_raffle_hold(
  uuid,
  smallint[],
  text,
  text,
  public.payment_method
)
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

grant execute
on function public.reject_raffle_reservation(uuid, text)
to service_role;