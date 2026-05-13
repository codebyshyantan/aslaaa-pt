import type { JSONValue, Sql } from "postgres";

import type { ActivityRepository } from "../activity.repository.js";
import type { ActivityLogRecord, CreateActivityLogInput } from "../activity.types.js";

type ActivityLogRow = {
  action: string;
  actor_role: ActivityLogRecord["actorRole"];
  actor_user_id: string | null;
  actor_username: string | null;
  created_at: Date | string;
  description: string;
  id: string;
  module: string;
  payload_json: Record<string, unknown>;
  target_id: string | null;
  target_type: string | null;
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapActivityLogRow(row: ActivityLogRow): ActivityLogRecord {
  return {
    action: row.action,
    actorRole: row.actor_role,
    actorUserId: row.actor_user_id,
    actorUsername: row.actor_username,
    createdAt: toIsoString(row.created_at),
    description: row.description,
    id: row.id,
    module: row.module,
    payloadJson: row.payload_json,
    targetId: row.target_id,
    targetType: row.target_type,
  };
}

export class PostgresActivityRepository implements ActivityRepository {
  private constructor(private readonly sql: Sql) {}

  static fromSql(sql: Sql) {
    return new PostgresActivityRepository(sql);
  }

  async create(input: CreateActivityLogInput) {
    const [row] = await this.sql<ActivityLogRow[]>`
      insert into activity_logs (
        actor_user_id,
        actor_username,
        actor_role,
        module,
        action,
        target_type,
        target_id,
        description,
        payload_json,
        created_at
      )
      values (
        ${input.actorUserId},
        ${input.actorUsername},
        ${input.actorRole},
        ${input.module},
        ${input.action},
        ${input.targetType},
        ${input.targetId},
        ${input.description},
        ${this.sql.json(input.payloadJson as JSONValue)},
        ${input.createdAt}
      )
      returning id, actor_user_id, actor_username, actor_role, module, action, target_type, target_id, description, payload_json, created_at
    `;

    if (!row) {
      throw new Error("Failed to create activity log.");
    }

    return mapActivityLogRow(row);
  }

  async listRecent(limit: number) {
    const rows = await this.sql<ActivityLogRow[]>`
      select id, actor_user_id, actor_username, actor_role, module, action, target_type, target_id, description, payload_json, created_at
      from activity_logs
      order by created_at desc
      limit ${limit}
    `;

    return rows.map(mapActivityLogRow);
  }
}
