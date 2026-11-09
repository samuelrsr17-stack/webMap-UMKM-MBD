alter table public.umkm_records
  add column if not exists description text not null default ''
  check (char_length(description) <= 500);
