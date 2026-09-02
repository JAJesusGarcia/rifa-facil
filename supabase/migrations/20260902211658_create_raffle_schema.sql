create type public.raffle_status as enum (
  'draft',
  'active',
  'closed',
  'drawn',
  'cancelled'
);

create type public.raffle_number_status as enum (
  'available',
  'held',
  'pending',
  'paid'
);

create type public.reservation_status as enum (
  'held',
  'pending',
  'paid',
  'rejected',
  'expired',
  'cancelled'
);

create type public.payment_method as enum (
  'transfer',
  'cash'
);

create table public.raffles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  description text,
  prize_title text not null,
  prize_description text,
  prize_image_url text,
  organizer_name text not null,
  contact_whatsapp text not null,
  payment_alias text not null,
  currency text not null default 'ARS'
    check (currency ~ '^[A-Z]{3}$'),
  number_price numeric(12, 2) not null
    check (number_price > 0),
  bundle_quantity smallint not null default 2
    check (bundle_quantity > 1),
  bundle_price numeric(12, 2) not null
    check (bundle_price > 0),
  total_numbers smallint not null default 100
    check (total_numbers between 1 and 1000),
  reservation_duration_minutes smallint not null default 30
    check (reservation_duration_minutes between 5 and 1440),
  draw_description text,
  status public.raffle_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null
    references public.raffles (id) on delete cascade,
  lookup_token uuid not null unique default gen_random_uuid(),
  customer_name text not null
    check (char_length(trim(customer_name)) between 2 and 120),
  customer_whatsapp text not null
    check (char_length(trim(customer_whatsapp)) between 6 and 30),
  payment_method public.payment_method not null,
  status public.reservation_status not null default 'held',
  total_amount numeric(12, 2) not null
    check (total_amount > 0),
  expires_at timestamptz,
  submitted_at timestamptz,
  confirmed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reservations_id_raffle_id_key
    unique (id, raffle_id),

  constraint held_reservation_requires_expiration
    check (status <> 'held' or expires_at is not null)
);

create table public.raffle_numbers (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null
    references public.raffles (id) on delete cascade,
  number smallint not null
    check (number >= 0),
  status public.raffle_number_status not null default 'available',
  current_reservation_id uuid,
  reserved_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint raffle_numbers_raffle_number_key
    unique (raffle_id, number),

  constraint raffle_numbers_id_raffle_id_key
    unique (id, raffle_id),

  constraint raffle_numbers_current_reservation_fk
    foreign key (current_reservation_id, raffle_id)
    references public.reservations (id, raffle_id)
    on delete restrict,

  constraint raffle_number_state_is_consistent
    check (
      (
        status = 'available'
        and current_reservation_id is null
        and reserved_until is null
      )
      or (
        status = 'held'
        and current_reservation_id is not null
        and reserved_until is not null
      )
      or (
        status in ('pending', 'paid')
        and current_reservation_id is not null
        and reserved_until is null
      )
    )
);

create table public.reservation_numbers (
  reservation_id uuid not null,
  raffle_id uuid not null,
  raffle_number_id uuid not null,
  number smallint not null
    check (number >= 0),
  created_at timestamptz not null default now(),

  primary key (reservation_id, raffle_number_id),

  constraint reservation_numbers_reservation_fk
    foreign key (reservation_id, raffle_id)
    references public.reservations (id, raffle_id)
    on delete cascade,

  constraint reservation_numbers_raffle_number_fk
    foreign key (raffle_number_id, raffle_id)
    references public.raffle_numbers (id, raffle_id)
    on delete restrict
);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique
    references public.reservations (id) on delete cascade,
  storage_path text not null unique,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null
    check (size_bytes > 0 and size_bytes <= 5242880),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index raffles_status_idx
  on public.raffles (status);

create index raffle_numbers_status_idx
  on public.raffle_numbers (raffle_id, status);

create index reservations_status_idx
  on public.reservations (raffle_id, status);

create index reservations_expiration_idx
  on public.reservations (expires_at)
  where status = 'held';

create index reservation_numbers_raffle_number_idx
  on public.reservation_numbers (raffle_number_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_raffle_numbers()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.raffle_numbers (raffle_id, number)
  select new.id, generated_number
  from generate_series(0, new.total_numbers - 1) as generated_number;

  return new;
end;
$$;

create or replace function public.prevent_total_numbers_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.total_numbers is distinct from old.total_numbers then
    raise exception
      'The total number of raffle entries cannot be changed after creation';
  end if;

  return new;
end;
$$;

create trigger raffles_set_updated_at
before update on public.raffles
for each row
execute function public.set_updated_at();

create trigger reservations_set_updated_at
before update on public.reservations
for each row
execute function public.set_updated_at();

create trigger raffle_numbers_set_updated_at
before update on public.raffle_numbers
for each row
execute function public.set_updated_at();

create trigger payment_proofs_set_updated_at
before update on public.payment_proofs
for each row
execute function public.set_updated_at();

create trigger raffles_generate_numbers
after insert on public.raffles
for each row
execute function public.generate_raffle_numbers();

create trigger raffles_prevent_total_numbers_change
before update of total_numbers on public.raffles
for each row
execute function public.prevent_total_numbers_change();

alter table public.raffles enable row level security;
alter table public.reservations enable row level security;
alter table public.raffle_numbers enable row level security;
alter table public.reservation_numbers enable row level security;
alter table public.payment_proofs enable row level security;

create policy "Public can view active raffles"
on public.raffles
for select
to anon, authenticated
using (
  status = 'active'
  or owner_id = (select auth.uid())
);

create policy "Owners can create raffles"
on public.raffles
for insert
to authenticated
with check (owner_id = (select auth.uid()));

create policy "Owners can update raffles"
on public.raffles
for update
to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

create policy "Owners can delete raffles"
on public.raffles
for delete
to authenticated
using (owner_id = (select auth.uid()));

create policy "Public can view numbers from active raffles"
on public.raffle_numbers
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.raffles
    where raffles.id = raffle_numbers.raffle_id
      and (
        raffles.status = 'active'
        or raffles.owner_id = (select auth.uid())
      )
  )
);

create policy "Owners can view reservations"
on public.reservations
for select
to authenticated
using (
  exists (
    select 1
    from public.raffles
    where raffles.id = reservations.raffle_id
      and raffles.owner_id = (select auth.uid())
  )
);

create policy "Owners can view reservation numbers"
on public.reservation_numbers
for select
to authenticated
using (
  exists (
    select 1
    from public.raffles
    where raffles.id = reservation_numbers.raffle_id
      and raffles.owner_id = (select auth.uid())
  )
);

create policy "Owners can view payment proofs"
on public.payment_proofs
for select
to authenticated
using (
  exists (
    select 1
    from public.reservations
    join public.raffles
      on raffles.id = reservations.raffle_id
    where reservations.id = payment_proofs.reservation_id
      and raffles.owner_id = (select auth.uid())
  )
);

revoke all on table public.raffles from anon, authenticated;
grant select on table public.raffles to anon, authenticated;
grant insert, update, delete on table public.raffles to authenticated;

revoke all on table public.raffle_numbers from anon, authenticated;
grant select on table public.raffle_numbers to anon, authenticated;

revoke all on table public.reservations from anon, authenticated;
grant select on table public.reservations to authenticated;

revoke all on table public.reservation_numbers from anon, authenticated;
grant select on table public.reservation_numbers to authenticated;

revoke all on table public.payment_proofs from anon, authenticated;
grant select on table public.payment_proofs to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.raffle_numbers replica identity full;

alter publication supabase_realtime
add table public.raffle_numbers;