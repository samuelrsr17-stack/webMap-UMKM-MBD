alter table public.map_points add column if not exists legacy_id text;

create unique index if not exists map_points_user_legacy_id_idx
  on public.map_points (user_id, legacy_id);
