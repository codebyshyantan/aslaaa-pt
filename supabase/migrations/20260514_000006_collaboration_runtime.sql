alter table lobbies
  add column if not exists last_updated_by_user_id uuid null references users(id) on delete set null,
  add column if not exists last_updated_by_username text null;

alter table system_settings
  add column if not exists updated_by_user_id uuid null references users(id) on delete set null,
  add column if not exists updated_by_username text null;

create index if not exists idx_lobbies_last_updated_by on lobbies(last_updated_by_user_id, updated_at desc);
create index if not exists idx_system_settings_updated_by on system_settings(updated_by_user_id, updated_at desc);
