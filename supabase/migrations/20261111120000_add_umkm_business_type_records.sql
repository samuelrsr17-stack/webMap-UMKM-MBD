create table if not exists public.umkm_business_type_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  village_code text not null references public.mbd_villages(code),
  year integer not null check (year between 2000 and 2100),
  culinary integer not null default 0 check (culinary >= 0),
  fashion integer not null default 0 check (fashion >= 0),
  handicraft integer not null default 0 check (handicraft >= 0),
  agribusiness_fisheries integer not null default 0 check (agribusiness_fisheries >= 0),
  trade integer not null default 0 check (trade >= 0),
  services_tourism integer not null default 0 check (services_tourism >= 0),
  creative_digital integer not null default 0 check (creative_digital >= 0),
  source text not null default '' check (char_length(source) <= 160),
  updated_at timestamptz not null default now(),
  unique (village_code, year)
);

create index if not exists umkm_business_type_records_year_idx
  on public.umkm_business_type_records (year desc);

drop trigger if exists umkm_business_type_records_touch_updated_at
  on public.umkm_business_type_records;
create trigger umkm_business_type_records_touch_updated_at
before update on public.umkm_business_type_records
for each row execute function public.touch_updated_at();

alter table public.umkm_business_type_records enable row level security;

drop policy if exists "Admins manage shared UMKM business types"
  on public.umkm_business_type_records;
drop policy if exists "Anyone can read shared UMKM business types"
  on public.umkm_business_type_records;
create policy "Admins manage shared UMKM business types"
  on public.umkm_business_type_records for all to authenticated
  using ((select public.is_app_admin()))
  with check ((select public.is_app_admin()));

grant select on public.umkm_business_type_records to authenticated;
grant insert, update, delete on public.umkm_business_type_records to authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) and not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'umkm_business_type_records'
  ) then
    alter publication supabase_realtime add table public.umkm_business_type_records;
  end if;
end;
$$;
