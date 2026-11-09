create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;
revoke all on table public.app_admins from public, anon, authenticated;
grant all on table public.app_admins to service_role;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to anon, authenticated;

drop policy if exists "Authenticated users can read village boundaries" on public.mbd_villages;
create policy "Anyone can read village boundaries"
  on public.mbd_villages for select to anon, authenticated
  using (true);

drop policy if exists "Users manage their own points" on public.map_points;
drop policy if exists "Anyone can read shared points" on public.map_points;
drop policy if exists "Admins manage shared points" on public.map_points;
create policy "Anyone can read shared points"
  on public.map_points for select to anon, authenticated
  using (true);
create policy "Admins manage shared points"
  on public.map_points for all to authenticated
  using ((select public.is_app_admin()))
  with check ((select public.is_app_admin()));

drop policy if exists "Users manage their own UMKM records" on public.umkm_records;
drop policy if exists "Anyone can read shared UMKM records" on public.umkm_records;
drop policy if exists "Admins manage shared UMKM records" on public.umkm_records;
create policy "Anyone can read shared UMKM records"
  on public.umkm_records for select to anon, authenticated
  using (true);
create policy "Admins manage shared UMKM records"
  on public.umkm_records for all to authenticated
  using ((select public.is_app_admin()))
  with check ((select public.is_app_admin()));

drop policy if exists "Users manage their own economy records" on public.economy_records;
drop policy if exists "Anyone can read shared economy records" on public.economy_records;
drop policy if exists "Admins manage shared economy records" on public.economy_records;
create policy "Anyone can read shared economy records"
  on public.economy_records for select to anon, authenticated
  using (true);
create policy "Admins manage shared economy records"
  on public.economy_records for all to authenticated
  using ((select public.is_app_admin()))
  with check ((select public.is_app_admin()));

grant select on public.mbd_villages to anon, authenticated;
grant select on public.map_points to anon, authenticated;
grant select, insert, update, delete on public.map_points to authenticated;
grant select on public.umkm_records to anon, authenticated;
grant select, insert, update, delete on public.umkm_records to authenticated;
grant select on public.economy_records to anon, authenticated;
grant select, insert, update, delete on public.economy_records to authenticated;
