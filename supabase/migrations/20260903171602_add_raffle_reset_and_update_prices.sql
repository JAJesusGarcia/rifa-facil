update public.raffles
set
  number_price = 6000,
  bundle_quantity = 2,
  bundle_price = 10000,
  max_numbers_per_reservation = 20
where slug = 'examen-taekwondo';

create or replace function public.reset_raffle(
  p_raffle_id uuid,
  p_owner_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_numbers_reset integer;
  v_reservations_deleted integer;
  v_storage_paths jsonb;
begin
  if p_raffle_id is null or p_owner_id is null then
    raise exception 'Raffle and owner are required';
  end if;

  perform 1
  from public.raffles
  where id = p_raffle_id
    and owner_id = p_owner_id
  for update;

  if not found then
    raise exception 'Raffle not found or access denied';
  end if;

  perform 1
  from public.raffle_numbers
  where raffle_id = p_raffle_id
  for update;

  select coalesce(
    jsonb_agg(payment_proofs.storage_path),
    '[]'::jsonb
  )
  into v_storage_paths
  from public.payment_proofs
  join public.reservations
    on reservations.id = payment_proofs.reservation_id
  where reservations.raffle_id = p_raffle_id;

  update public.raffle_numbers
  set
    status = 'available',
    current_reservation_id = null,
    reserved_until = null
  where raffle_id = p_raffle_id;

  get diagnostics v_numbers_reset = row_count;

  delete from public.reservations
  where raffle_id = p_raffle_id;

  get diagnostics v_reservations_deleted = row_count;

  update public.raffles
  set status = 'active'
  where id = p_raffle_id;

  return jsonb_build_object(
    'raffleId', p_raffle_id,
    'numbersReset', v_numbers_reset,
    'reservationsDeleted', v_reservations_deleted,
    'storagePaths', v_storage_paths
  );
end;
$$;

revoke execute
on function public.reset_raffle(uuid, uuid)
from public, anon, authenticated;

grant execute
on function public.reset_raffle(uuid, uuid)
to service_role;