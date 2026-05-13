import type { Sql } from "postgres";

import { MemoryActivityRepository } from "./repositories/memory-activity-repository.js";
import { PostgresActivityRepository } from "./repositories/postgres-activity-repository.js";
import type { ActivityLogRecord, CreateActivityLogInput } from "./activity.types.js";

export interface ActivityRepository {
  create(input: CreateActivityLogInput): Promise<ActivityLogRecord>;
  listRecent(limit: number): Promise<ActivityLogRecord[]>;
}

export function createActivityRepository(storageDriver: "memory" | "postgres", sql?: Sql) {
  if (storageDriver === "memory") {
    return new MemoryActivityRepository();
  }

  if (!sql) {
    throw new Error("A Postgres SQL client is required for the activity repository.");
  }

  return PostgresActivityRepository.fromSql(sql);
}
