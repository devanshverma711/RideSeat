-- Run this whole file once in Supabase: SQL Editor > New query > Run
create extension if not exists pgcrypto;

create table drivers (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,                 -- 10 digits, no country code
  created_at timestamptz default now()
);

create table cars (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers(id) on delete cascade,
  name text not null,
  plate text,
  layout text not null default 'sedan4',
  created_at timestamptz default now()
);

create table trips (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,           -- used in the share link /t/<code>
  driver_id uuid not null references drivers(id) on delete cascade,
  car_id uuid not null references cars(id),
  from_place text not null,
  to_place text not null,
  depart_at timestamptz not null,
  distance_km numeric,
  auto_confirm boolean not null default false,
  status text not null default 'open' check (status in ('open','cancelled','completed')),
  created_at timestamptz default now()
);

create table trip_seats (
  trip_id uuid not null references trips(id) on delete cascade,
  seat_no int not null,
  price int not null check (price >= 0),
  primary key (trip_id, seat_no)
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null,
  seat_no int not null,
  passenger_name text not null,
  passenger_phone text not null,       -- 10 digits
  status text not null default 'pending'
    check (status in ('pending','confirmed','rejected','cancelled')),
  source text not null default 'link' check (source in ('link','manual')),
  created_at timestamptz default now(),
  foreign key (trip_id, seat_no) references trip_seats(trip_id, seat_no) on delete cascade
);

-- THE double-booking guard: a seat can have only one active booking per trip.
-- Rejected or cancelled bookings free the seat automatically.
create unique index one_active_booking_per_seat
  on bookings (trip_id, seat_no) where status in ('pending','confirmed');

create index on bookings (passenger_phone);
create index on trips (driver_id, depart_at);

-- Row level security: drivers see only their own data
alter table drivers enable row level security;
alter table cars enable row level security;
alter table trips enable row level security;
alter table trip_seats enable row level security;
alter table bookings enable row level security;

create policy drivers_own on drivers for all using (id = auth.uid()) with check (id = auth.uid());
create policy cars_own on cars for all using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy trips_own on trips for all using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy seats_own on trip_seats for all
  using (exists (select 1 from trips t where t.id = trip_id and t.driver_id = auth.uid()))
  with check (exists (select 1 from trips t where t.id = trip_id and t.driver_id = auth.uid()));
create policy bookings_own on bookings for all
  using (exists (select 1 from trips t where t.id = trip_id and t.driver_id = auth.uid()))
  with check (exists (select 1 from trips t where t.id = trip_id and t.driver_id = auth.uid()));

-- Passengers do not log in. They use these functions, which run with
-- elevated rights but only expose what a passenger needs.

create or replace function get_trip_public(p_code text) returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'id', t.id, 'code', t.code, 'from_place', t.from_place, 'to_place', t.to_place,
    'depart_at', t.depart_at, 'distance_km', t.distance_km, 'status', t.status,
    'auto_confirm', t.auto_confirm,
    'driver_name', d.name, 'driver_phone', d.phone,
    'car_name', c.name, 'car_plate', c.plate, 'layout', c.layout,
    'seats', (
      select coalesce(json_agg(json_build_object(
        'seat_no', s.seat_no, 'price', s.price,
        'taken', exists (select 1 from bookings b
                         where b.trip_id = s.trip_id and b.seat_no = s.seat_no
                           and b.status in ('pending','confirmed'))
      ) order by s.seat_no), '[]'::json)
      from trip_seats s where s.trip_id = t.id)
  )
  from trips t
  join drivers d on d.id = t.driver_id
  join cars c on c.id = t.car_id
  where t.code = p_code;
$$;

create or replace function request_seats(p_code text, p_name text, p_phone text, p_seats int[])
returns json language plpgsql security definer set search_path = public as $$
declare
  t trips;
  s int;
  st text;
begin
  select * into t from trips where code = p_code;
  if not found then raise exception 'trip_not_found'; end if;
  if t.status <> 'open' or t.depart_at < now() then raise exception 'trip_closed'; end if;
  if coalesce(array_length(p_seats, 1), 0) = 0 or array_length(p_seats, 1) > 6 then
    raise exception 'bad_seats';
  end if;
  if length(trim(p_name)) < 2 then raise exception 'bad_name'; end if;
  if p_phone !~ '^[6-9][0-9]{9}$' then raise exception 'bad_phone'; end if;

  st := case when t.auto_confirm then 'confirmed' else 'pending' end;

  -- All seats or none: any failure rolls back the whole call.
  foreach s in array p_seats loop
    begin
      insert into bookings (trip_id, seat_no, passenger_name, passenger_phone, status)
      values (t.id, s, trim(p_name), p_phone, st);
    exception
      when unique_violation then raise exception 'seat_taken';
      when foreign_key_violation then raise exception 'bad_seats';
    end;
  end loop;

  return json_build_object('status', st, 'seats', p_seats);
end $$;

create or replace function my_bookings(p_phone text) returns json
language sql security definer set search_path = public as $$
  select coalesce(json_agg(x order by x.depart_at desc), '[]'::json) from (
    select b.id, b.seat_no, b.status, b.passenger_name,
           t.code, t.from_place, t.to_place, t.depart_at, t.status as trip_status,
           s.price, d.name as driver_name, d.phone as driver_phone
    from bookings b
    join trips t on t.id = b.trip_id
    join trip_seats s on s.trip_id = b.trip_id and s.seat_no = b.seat_no
    join drivers d on d.id = t.driver_id
    where b.passenger_phone = p_phone
  ) x;
$$;

create or replace function cancel_booking(p_id uuid, p_phone text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update bookings set status = 'cancelled'
  where id = p_id and passenger_phone = p_phone and status in ('pending','confirmed');
  return found;
end $$;

grant execute on function get_trip_public(text) to anon, authenticated;
grant execute on function request_seats(text, text, text, int[]) to anon, authenticated;
grant execute on function my_bookings(text) to anon, authenticated;
grant execute on function cancel_booking(uuid, text) to anon, authenticated;
