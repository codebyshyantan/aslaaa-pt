create unique index if not exists uq_merge_presets_favorite_per_scrim
on merge_presets(scrim_id)
where is_favorite = true;
