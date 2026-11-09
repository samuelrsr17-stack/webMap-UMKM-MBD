drop index if exists public.map_points_user_legacy_id_idx;

alter table public.map_points
  drop column if exists legacy_id;
