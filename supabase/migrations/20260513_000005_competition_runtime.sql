create table if not exists system_settings (
  key text primary key,
  value_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists scrim_tiers (
  id uuid primary key default gen_random_uuid(),
  scrim_id uuid not null references scrims(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scrim_tiers_scrim_name_unique unique (scrim_id, name)
);

create table if not exists scrim_groups (
  id uuid primary key default gen_random_uuid(),
  tier_id uuid not null references scrim_tiers(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint scrim_groups_tier_name_unique unique (tier_id, name)
);

create table if not exists lobbies (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references scrim_groups(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lobbies_group_name_unique unique (group_id, name)
);

create table if not exists lobby_entries (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  team_name text not null,
  normalized_team_name text not null,
  slot_number integer null check (slot_number is null or slot_number between 1 and 64),
  position integer null check (position is null or position between 1 and 64),
  kills integer not null default 0 check (kills between 0 and 99),
  placement_points integer not null default 0,
  total_points integer not null default 0,
  rank integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lobby_entries_lobby_team_unique unique (lobby_id, normalized_team_name)
);

create table if not exists merge_preset_lobbies (
  preset_id uuid not null references merge_presets(id) on delete cascade,
  lobby_id uuid not null references lobbies(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (preset_id, lobby_id)
);

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  config_id uuid not null references auto_merge_configs(id) on delete cascade,
  scrim_id uuid not null references scrims(id) on delete cascade,
  merge_id uuid not null references merge_presets(id) on delete cascade,
  run_date date not null,
  status text not null check (status in ('COMPLETED', 'FAILED', 'SKIPPED')),
  detected_active_records integer not null default 0,
  snapshot_id uuid null references daily_snapshots(id) on delete set null,
  summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  constraint uq_automation_runs_config_date unique (config_id, run_date)
);

create index if not exists idx_scrim_tiers_scrim_sort on scrim_tiers(scrim_id, sort_order);
create index if not exists idx_scrim_groups_tier_sort on scrim_groups(tier_id, sort_order);
create index if not exists idx_lobbies_group_sort on lobbies(group_id, sort_order);
create index if not exists idx_lobby_entries_lobby_rank on lobby_entries(lobby_id, rank);
create index if not exists idx_merge_preset_lobbies_lobby on merge_preset_lobbies(lobby_id);
create index if not exists idx_automation_runs_scrim_created on automation_runs(scrim_id, created_at desc);
create index if not exists idx_activity_logs_target_created on activity_logs(target_type, created_at desc);

drop trigger if exists scrim_tiers_set_updated_at on scrim_tiers;
create trigger scrim_tiers_set_updated_at
before update on scrim_tiers
for each row
execute function set_updated_at();

drop trigger if exists scrim_groups_set_updated_at on scrim_groups;
create trigger scrim_groups_set_updated_at
before update on scrim_groups
for each row
execute function set_updated_at();

drop trigger if exists lobbies_set_updated_at on lobbies;
create trigger lobbies_set_updated_at
before update on lobbies
for each row
execute function set_updated_at();

drop trigger if exists lobby_entries_set_updated_at on lobby_entries;
create trigger lobby_entries_set_updated_at
before update on lobby_entries
for each row
execute function set_updated_at();

insert into system_settings (key, value_json, updated_at)
values (
  'point-system',
  '{"killPointValue":1,"positionPoints":[15,12,10,8,6,4,2,1,1,1,0,0,0,0,0,0]}'::jsonb,
  timezone('utc', now())
)
on conflict (key)
do nothing;
