create extension if not exists pgcrypto;
create extension if not exists citext;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('ADMIN', 'PT_MAKER');
  end if;

  if not exists (select 1 from pg_type where typname = 'audit_action') then
    create type audit_action as enum (
      'LOGIN',
      'LOGOUT',
      'FAILED_LOGIN',
      'ROLE_VIOLATION',
      'INVALID_ACCESS_ATTEMPT'
    );
  end if;
end
$$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username citext not null unique,
  role app_role not null,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  last_login_at timestamptz null
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  refresh_token_hash text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default timezone('utc', now()),
  ip inet null,
  user_agent text null,
  constraint sessions_expires_after_create check (expires_at > created_at)
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references users(id) on delete set null,
  action audit_action not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_users_role_active on users(role, is_active);
create index if not exists idx_sessions_user_id on sessions(user_id);
create index if not exists idx_sessions_expires_at on sessions(expires_at);
create index if not exists idx_audit_logs_actor_created_at on audit_logs(actor_user_id, created_at desc);
create index if not exists idx_audit_logs_action_created_at on audit_logs(action, created_at desc);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
before update on users
for each row
execute function set_updated_at();

create or replace function block_audit_log_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs are immutable';
end;
$$;

drop trigger if exists audit_logs_no_update on audit_logs;
create trigger audit_logs_no_update
before update on audit_logs
for each row
execute function block_audit_log_mutation();

drop trigger if exists audit_logs_no_delete on audit_logs;
create trigger audit_logs_no_delete
before delete on audit_logs
for each row
execute function block_audit_log_mutation();
