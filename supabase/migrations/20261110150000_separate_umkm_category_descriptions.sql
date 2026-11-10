alter table public.umkm_records
  add column if not exists description_micro text not null default ''
    check (char_length(description_micro) <= 500),
  add column if not exists description_small text not null default ''
    check (char_length(description_small) <= 500),
  add column if not exists description_medium text not null default ''
    check (char_length(description_medium) <= 500);

update public.umkm_records
set description_micro = description,
    description_small = description,
    description_medium = description
where description <> '';
