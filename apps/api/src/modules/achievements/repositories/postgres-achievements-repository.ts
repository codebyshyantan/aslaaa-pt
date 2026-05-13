import type { Sql } from "postgres";

import type { AchievementsRepository } from "../achievements.repository.js";
import type { AchievementRecord, CreateAchievementInput } from "../achievements.types.js";

type AchievementRow = {
  created_at: Date | string;
  created_by_user_id: string;
  created_by_username: string;
  description: string;
  id: string;
  title: string;
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapAchievementRow(row: AchievementRow): AchievementRecord {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: toIsoString(row.created_at),
    createdByUserId: row.created_by_user_id,
    createdByUsername: row.created_by_username,
  };
}

export class PostgresAchievementsRepository implements AchievementsRepository {
  private constructor(private readonly sql: Sql) {}

  static fromSql(sql: Sql) {
    return new PostgresAchievementsRepository(sql);
  }

  async create(input: CreateAchievementInput) {
    const [row] = await this.sql<AchievementRow[]>`
      insert into achievements (title, description, created_by_user_id, created_by_username, created_at)
      values (${input.title}, ${input.description}, ${input.createdByUserId}, ${input.createdByUsername}, ${input.createdAt})
      returning id, title, description, created_by_user_id, created_by_username, created_at
    `;

    if (!row) {
      throw new Error("Failed to create achievement.");
    }

    return mapAchievementRow(row);
  }

  async list() {
    const rows = await this.sql<AchievementRow[]>`
      select id, title, description, created_by_user_id, created_by_username, created_at
      from achievements
      order by created_at desc
    `;

    return rows.map(mapAchievementRow);
  }
}
