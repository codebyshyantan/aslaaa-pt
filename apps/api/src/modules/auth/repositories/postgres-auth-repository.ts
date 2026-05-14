import { type JSONValue, type Sql } from "postgres";

import type { AuthRepository } from "../auth.repository.js";
import type {
  AuthUserRecord,
  CreateAuditLogInput,
  CreateSessionInput,
  LoginDirectory,
  ManagedUserRecord,
  SessionRecord,
  SessionWithUserRecord,
} from "../auth.types.js";
import { createPostgresClient } from "../../../persistence/postgres-client.js";

type PostgresUserRow = {
  created_at: Date | string;
  id: string;
  is_active: boolean;
  last_login_at: Date | string | null;
  password_hash: string;
  role: AuthUserRecord["role"];
  updated_at: Date | string;
  username: string;
};

type PostgresSessionJoinRow = {
  expires_at: Date | string;
  ip: string | null;
  last_login_at: Date | string | null;
  last_seen_at: Date | string;
  password_hash: string;
  refresh_token_hash: string;
  role: AuthUserRecord["role"];
  session_created_at: Date | string;
  session_id: string;
  user_active: boolean;
  user_agent: string | null;
  user_created_at: Date | string;
  user_id: string;
  user_updated_at: Date | string;
  username: string;
};

type PostgresDirectoryRow = {
  id: string;
  role: AuthUserRecord["role"];
  username: string;
};

function toIsoString(value: Date | string | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapUserRow(row: PostgresUserRow): AuthUserRecord {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    passwordHash: row.password_hash,
    isActive: row.is_active,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
    lastLoginAt: toIsoString(row.last_login_at),
  };
}

function toManagedUserRecord(row: PostgresUserRow): ManagedUserRecord {
  return {
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    id: row.id,
    isActive: row.is_active,
    lastLoginAt: toIsoString(row.last_login_at),
    role: row.role,
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
    username: row.username,
  };
}

function mapSessionJoinRow(row: PostgresSessionJoinRow): SessionWithUserRecord {
  const sessionRecord: SessionRecord = {
    id: row.session_id,
    userId: row.user_id,
    refreshTokenHash: row.refresh_token_hash,
    createdAt: toIsoString(row.session_created_at) ?? new Date().toISOString(),
    expiresAt: toIsoString(row.expires_at) ?? new Date().toISOString(),
    lastSeenAt: toIsoString(row.last_seen_at) ?? new Date().toISOString(),
    ip: row.ip,
    userAgent: row.user_agent,
  };

  const userRecord: AuthUserRecord = {
    id: row.user_id,
    username: row.username,
    role: row.role,
    passwordHash: row.password_hash,
    isActive: row.user_active,
    createdAt: toIsoString(row.user_created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.user_updated_at) ?? new Date().toISOString(),
    lastLoginAt: toIsoString(row.last_login_at),
  };

  return {
    session: sessionRecord,
    user: userRecord,
  };
}

export class PostgresAuthRepository implements AuthRepository {
  private constructor(private readonly sql: Sql) {}

  static create(databaseUrl: string) {
    return new PostgresAuthRepository(createPostgresClient(databaseUrl));
  }

  static fromSql(sql: Sql) {
    return new PostgresAuthRepository(sql);
  }

  async listLoginDirectory(): Promise<LoginDirectory> {
    const rows = await this.sql<PostgresDirectoryRow[]>`
      select id, username, role
      from users
      where is_active = true
      order by role asc, username asc
    `;

    const directory: LoginDirectory = {
      ADMIN: [],
      PT_MAKER: [],
    };

    for (const row of rows) {
      directory[row.role].push({
        value: row.username,
        label: row.username,
        subtitle: row.role === "ADMIN" ? "Administrator" : "PT Operations",
      });
    }

    return directory;
  }

  async findUserByUsername(username: string) {
    const [row] = await this.sql<PostgresUserRow[]>`
      select id, username, role, password_hash, is_active, created_at, updated_at, last_login_at
      from users
      where username = ${username}
      limit 1
    `;

    return row ? mapUserRow(row) : null;
  }

  async createSession(input: CreateSessionInput) {
    await this.sql`
      insert into sessions (
        id,
        user_id,
        refresh_token_hash,
        created_at,
        expires_at,
        last_seen_at,
        ip,
        user_agent
      )
      values (
        ${input.id},
        ${input.userId},
        ${input.refreshTokenHash},
        ${input.createdAt},
        ${input.expiresAt},
        ${input.lastSeenAt},
        ${input.ip},
        ${input.userAgent}
      )
    `;
  }

  async findSessionByTokenHash(tokenHash: string) {
    const [row] = await this.sql<PostgresSessionJoinRow[]>`
      select
        s.id as session_id,
        s.user_id,
        s.refresh_token_hash,
        s.created_at as session_created_at,
        s.expires_at,
        s.last_seen_at,
        s.ip,
        s.user_agent,
        u.username,
        u.role,
        u.password_hash,
        u.is_active as user_active,
        u.created_at as user_created_at,
        u.updated_at as user_updated_at,
        u.last_login_at
      from sessions s
      inner join users u on u.id = s.user_id
      where s.refresh_token_hash = ${tokenHash}
        and s.expires_at > now()
      limit 1
    `;

    return row ? mapSessionJoinRow(row) : null;
  }

  async deleteSessionByTokenHash(tokenHash: string) {
    const [row] = await this.sql<PostgresSessionJoinRow[]>`
      with deleted_session as (
        delete from sessions
        where refresh_token_hash = ${tokenHash}
        returning id, user_id, refresh_token_hash, created_at, expires_at, last_seen_at, ip, user_agent
      )
      select
        ds.id as session_id,
        ds.user_id,
        ds.refresh_token_hash,
        ds.created_at as session_created_at,
        ds.expires_at,
        ds.last_seen_at,
        ds.ip,
        ds.user_agent,
        u.username,
        u.role,
        u.password_hash,
        u.is_active as user_active,
        u.created_at as user_created_at,
        u.updated_at as user_updated_at,
        u.last_login_at
      from deleted_session ds
      inner join users u on u.id = ds.user_id
      limit 1
    `;

    return row ? mapSessionJoinRow(row) : null;
  }

  async touchSession(sessionId: string, lastSeenAt: string) {
    await this.sql`
      update sessions
      set last_seen_at = ${lastSeenAt}
      where id = ${sessionId}
    `;
  }

  async updateUserLastLogin(userId: string, lastLoginAt: string) {
    await this.sql`
      update users
      set last_login_at = ${lastLoginAt}, updated_at = ${lastLoginAt}
      where id = ${userId}
    `;
  }

  async createAuditLog(input: CreateAuditLogInput) {
    await this.sql`
      insert into audit_logs (actor_user_id, action, payload_json, created_at)
      values (
        ${input.actorUserId},
        ${input.action},
        ${this.sql.json(input.payloadJson as JSONValue)},
        ${input.createdAt}
      )
    `;
  }

  async listUsers(): Promise<ManagedUserRecord[]> {
    const rows = await this.sql<PostgresUserRow[]>`
      select id, username, role, password_hash, is_active, created_at, updated_at, last_login_at
      from users
      order by username asc
    `;

    return rows.map(toManagedUserRecord);
  }

  async createUser(input: {
    createdAt: string;
    isActive: boolean;
    passwordHash: string;
    role: AuthUserRecord["role"];
    updatedAt: string;
    username: string;
  }): Promise<ManagedUserRecord> {
    const [row] = await this.sql<PostgresUserRow[]>`
      insert into users (username, role, password_hash, is_active, created_at, updated_at)
      values (${input.username}, ${input.role}, ${input.passwordHash}, ${input.isActive}, ${input.createdAt}, ${input.updatedAt})
      returning id, username, role, password_hash, is_active, created_at, updated_at, last_login_at
    `;

    if (!row) {
      throw new Error("Failed to create user.");
    }

    return toManagedUserRecord(row);
  }

  async deleteUser(userId: string): Promise<ManagedUserRecord | null> {
    const [row] = await this.sql<PostgresUserRow[]>`
      delete from users
      where id = ${userId}
      returning id, username, role, password_hash, is_active, created_at, updated_at, last_login_at
    `;

    return row ? toManagedUserRecord(row) : null;
  }

  async updateUserPassword(userId: string, passwordHash: string, updatedAt: string): Promise<ManagedUserRecord | null> {
    return this.sql.begin(async (transaction) => {
      await transaction`
        delete from sessions
        where user_id = ${userId}
      `;

      const [row] = await transaction<PostgresUserRow[]>`
        update users
        set password_hash = ${passwordHash}, updated_at = ${updatedAt}
        where id = ${userId}
        returning id, username, role, password_hash, is_active, created_at, updated_at, last_login_at
      `;

      return row ? toManagedUserRecord(row) : null;
    });
  }

  async updateUserStatus(userId: string, isActive: boolean, updatedAt: string): Promise<ManagedUserRecord | null> {
    const [row] = await this.sql<PostgresUserRow[]>`
      update users
      set is_active = ${isActive}, updated_at = ${updatedAt}
      where id = ${userId}
      returning id, username, role, password_hash, is_active, created_at, updated_at, last_login_at
    `;

    return row ? toManagedUserRecord(row) : null;
  }
}
