drop policy if exists "Anyone can read shared UMKM business types"
  on public.umkm_business_type_records;
create policy "Anyone can read shared UMKM business types"
  on public.umkm_business_type_records for select to anon, authenticated
  using (true);

grant select on public.umkm_business_type_records to anon, authenticated;
