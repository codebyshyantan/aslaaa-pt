create table if not exists scrims (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists merge_presets (
  id uuid primary key default gen_random_uuid(),
  scrim_id uuid not null references scrims(id) on delete cascade,
  name text not null,
  is_favorite boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint merge_presets_scrim_name_unique unique (scrim_id, name)
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references users(id) on delete set null,
  actor_username citext null,
  actor_role app_role null,
  module text not null,
  action text not null,
  target_type text null,
  target_id text null,
  description text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_scrims_is_active on scrims(is_active);
create index if not exists idx_merge_presets_scrim_id on merge_presets(scrim_id);
create index if not exists idx_merge_presets_scrim_favorite on merge_presets(scrim_id, is_favorite);
create index if not exists idx_activity_logs_module_created_at on activity_logs(module, created_at desc);
create index if not exists idx_activity_logs_actor_created_at on activity_logs(actor_user_id, created_at desc);

drop trigger if exists scrims_set_updated_at on scrims;
create trigger scrims_set_updated_at
before update on scrims
for each row
execute function set_updated_at();

drop trigger if exists merge_presets_set_updated_at on merge_presets;
create trigger merge_presets_set_updated_at
before update on merge_presets
for each row
execute function set_updated_at();

alter table auto_merge_configs
  alter column scrim_id type uuid using nullif(scrim_id, '')::uuid,
  alter column favorite_merge_id type uuid using nullif(favorite_merge_id, '')::uuid;

alter table daily_snapshots
  alter column scrim_id type uuid using nullif(scrim_id, '')::uuid,
  alter column merge_id type uuid using nullif(merge_id, '')::uuid;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'auto_merge_configs_scrim_id_fkey'
      and table_name = 'auto_merge_configs'
  ) then
    alter table auto_merge_configs
      add constraint auto_merge_configs_scrim_id_fkey
      foreign key (scrim_id) references scrims(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'auto_merge_configs_favorite_merge_id_fkey'
      and table_name = 'auto_merge_configs'
  ) then
    alter table auto_merge_configs
      add constraint auto_merge_configs_favorite_merge_id_fkey
      foreign key (favorite_merge_id) references merge_presets(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'daily_snapshots_scrim_id_fkey'
      and table_name = 'daily_snapshots'
  ) then
    alter table daily_snapshots
      add constraint daily_snapshots_scrim_id_fkey
      foreign key (scrim_id) references scrims(id) on delete cascade;
  end if;

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_name = 'daily_snapshots_merge_id_fkey'
      and table_name = 'daily_snapshots'
  ) then
    alter table daily_snapshots
      add constraint daily_snapshots_merge_id_fkey
      foreign key (merge_id) references merge_presets(id) on delete cascade;
  end if;
end
$$;

create unique index if not exists uq_auto_merge_configs_scrim_id on auto_merge_configs(scrim_id);
create unique index if not exists uq_daily_snapshots_scrim_date on daily_snapshots(scrim_id, date);
