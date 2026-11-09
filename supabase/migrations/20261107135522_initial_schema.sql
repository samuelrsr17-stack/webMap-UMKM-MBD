-- Spatial checks keep saved map points inside their selected village.
create extension if not exists postgis with schema extensions;

create table if not exists public.mbd_villages (
  code text primary key,
  name text not null,
  district_code text not null,
  district_name text not null,
  geom extensions.geometry(MultiPolygon, 4326) not null
);

create index if not exists mbd_villages_geom_idx
  on public.mbd_villages using gist (geom);

create table if not exists public.map_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  village_code text not null references public.mbd_villages(code),
  category text not null check (category in ('umkm', 'publik', 'layanan', 'lainnya')),
  lat double precision not null check (lat between -10 and -6),
  lng double precision not null check (lng between 125 and 131),
  value numeric(18, 2) check (value is null or value >= 0),
  description text not null default '' check (char_length(description) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.umkm_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  village_code text not null references public.mbd_villages(code),
  year integer not null check (year between 2000 and 2100),
  micro integer not null default 0 check (micro >= 0),
  small integer not null default 0 check (small >= 0),
  medium integer not null default 0 check (medium >= 0),
  source text not null default '' check (char_length(source) <= 160),
  updated_at timestamptz not null default now(),
  unique (user_id, village_code, year)
);

create table if not exists public.economy_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  village_code text not null references public.mbd_villages(code),
  year integer not null check (year between 2000 and 2100),
  turnover numeric(18, 2) not null default 0 check (turnover >= 0),
  workers integer not null default 0 check (workers >= 0),
  investment numeric(18, 2) not null default 0 check (investment >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, village_code, year)
);

create index if not exists map_points_user_updated_idx on public.map_points (user_id, updated_at desc);
create index if not exists umkm_records_user_year_idx on public.umkm_records (user_id, year desc);
create index if not exists economy_records_user_year_idx on public.economy_records (user_id, year desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_map_point_location()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  selected_village public.mbd_villages%rowtype;
  point_geom extensions.geometry;
begin
  select * into selected_village
  from public.mbd_villages
  where code = new.village_code;

  if not found then
    raise exception 'Desa tidak dikenal.';
  end if;

  point_geom := extensions.st_setsrid(extensions.st_makepoint(new.lng, new.lat), 4326);
  if not extensions.st_covers(selected_village.geom, point_geom) then
    raise exception 'Koordinat harus berada di wilayah desa yang dipilih.';
  end if;

  return new;
end;
$$;

drop trigger if exists map_points_validate_location on public.map_points;
create trigger map_points_validate_location
before insert or update of village_code, lat, lng on public.map_points
for each row execute function public.validate_map_point_location();

drop trigger if exists map_points_touch_updated_at on public.map_points;
create trigger map_points_touch_updated_at
before update on public.map_points
for each row execute function public.touch_updated_at();

drop trigger if exists umkm_records_touch_updated_at on public.umkm_records;
create trigger umkm_records_touch_updated_at
before update on public.umkm_records
for each row execute function public.touch_updated_at();

drop trigger if exists economy_records_touch_updated_at on public.economy_records;
create trigger economy_records_touch_updated_at
before update on public.economy_records
for each row execute function public.touch_updated_at();

create or replace function public.upsert_mbd_villages(features jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  feature jsonb;
  properties jsonb;
  changed integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Hanya service role yang boleh memuat batas wilayah.';
  end if;
  if jsonb_typeof(features) <> 'array' then
    raise exception 'Fitur GeoJSON harus berupa array.';
  end if;

  for feature in select value from jsonb_array_elements(features)
  loop
    properties := feature -> 'properties';
    insert into public.mbd_villages (code, name, district_code, district_name, geom)
    values (
      properties ->> 'code',
      properties ->> 'name',
      properties ->> 'kecCode',
      properties ->> 'kecamatan',
      extensions.st_multi(
        extensions.st_setsrid(extensions.st_geomfromgeojson((feature -> 'geometry')::text), 4326)
      )::extensions.geometry(MultiPolygon, 4326)
    )
    on conflict (code) do update set
      name = excluded.name,
      district_code = excluded.district_code,
      district_name = excluded.district_name,
      geom = excluded.geom;
    changed := changed + 1;
  end loop;

  return changed;
end;
$$;

revoke all on function public.upsert_mbd_villages(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_mbd_villages(jsonb) to service_role;

alter table public.mbd_villages enable row level security;
alter table public.map_points enable row level security;
alter table public.umkm_records enable row level security;
alter table public.economy_records enable row level security;

drop policy if exists "Authenticated users can read village boundaries" on public.mbd_villages;
create policy "Authenticated users can read village boundaries"
  on public.mbd_villages for select to authenticated using (true);

drop policy if exists "Users manage their own points" on public.map_points;
create policy "Users manage their own points"
  on public.map_points for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own UMKM records" on public.umkm_records;
create policy "Users manage their own UMKM records"
  on public.umkm_records for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage their own economy records" on public.economy_records;
create policy "Users manage their own economy records"
  on public.economy_records for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.mbd_villages to authenticated;
grant select, insert, update, delete on public.map_points to authenticated;
grant select, insert, update, delete on public.umkm_records to authenticated;
grant select, insert, update, delete on public.economy_records to authenticated;
