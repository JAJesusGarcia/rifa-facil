alter table public.raffles
alter column max_numbers_per_reservation set default 20;

update public.raffles
set max_numbers_per_reservation = 20
where slug = 'examen-taekwondo';