do $$
begin
  if not exists (select 1 from pg_type where typname = 'suggestion_status') then
    create type suggestion_status as enum ('PENDING', 'UNDER_REVIEW', 'IMPLEMENTED', 'REJECTED');
  end if;
end
$$;

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  display_name text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists suggestions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  submitted_by_user_id uuid not null references users(id) on delete restrict,
  submitted_by_username citext not null,
  submitted_by_role app_role not null,
  status suggestion_status not null default 'PENDING',
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  created_by_user_id uuid not null references users(id) on delete restrict,
  created_by_username citext not null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists auto_merge_configs (
  id uuid primary key default gen_random_uuid(),
  scrim_id text not null,
  favorite_merge_id text not null,
  reset_time time not null default '05:00',
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists daily_snapshots (
  id uuid primary key default gen_random_uuid(),
  scrim_id text not null,
  merge_id text not null,
  date date not null,
  day_name text not null,
  standings_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_suggestions_status_created_at on suggestions(status, created_at desc);
create index if not exists idx_achievements_created_at on achievements(created_at desc);
create index if not exists idx_auto_merge_configs_scrim_id on auto_merge_configs(scrim_id);
create index if not exists idx_daily_snapshots_scrim_date on daily_snapshots(scrim_id, date desc);

create or replace function block_daily_snapshot_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'daily_snapshots are immutable';
end;
$$;

drop trigger if exists daily_snapshots_no_update on daily_snapshots;
create trigger daily_snapshots_no_update
before update on daily_snapshots
for each row
execute function block_daily_snapshot_mutation();

drop trigger if exists daily_snapshots_no_delete on daily_snapshots;
create trigger daily_snapshots_no_delete
before delete on daily_snapshots
for each row
execute function block_daily_snapshot_mutation();
