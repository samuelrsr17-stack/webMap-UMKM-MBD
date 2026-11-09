delete from public.map_points
where category in ('umkm', 'publik', 'layanan', 'lainnya');

alter table public.map_points
  drop constraint if exists map_points_category_check;

alter table public.map_points
  add constraint map_points_category_check
  check (category in ('mikro', 'kecil', 'menengah'));
