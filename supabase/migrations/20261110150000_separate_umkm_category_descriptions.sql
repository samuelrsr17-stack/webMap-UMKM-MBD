do $$
declare
  has_description_micro boolean;
  has_description_small boolean;
  has_description_medium boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'umkm_records'
      and column_name = 'description_micro'
  ) into has_description_micro;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'umkm_records'
      and column_name = 'description_small'
  ) into has_description_small;
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'umkm_records'
      and column_name = 'description_medium'
  ) into has_description_medium;

  alter table public.umkm_records
    add column if not exists description_micro text not null default ''
      check (char_length(description_micro) <= 500),
    add column if not exists description_small text not null default ''
      check (char_length(description_small) <= 500),
    add column if not exists description_medium text not null default ''
      check (char_length(description_medium) <= 500);

  if not has_description_micro then
    update public.umkm_records
    set description_micro = description
    where description <> '';
  end if;
  if not has_description_small then
    update public.umkm_records
    set description_small = description
    where description <> '';
  end if;
  if not has_description_medium then
    update public.umkm_records
    set description_medium = description
    where description <> '';
  end if;
end;
$$;
