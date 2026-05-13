import type { Sql } from "postgres";

import { MemoryAchievementsRepository } from "./repositories/memory-achievements-repository.js";
import { PostgresAchievementsRepository } from "./repositories/postgres-achievements-repository.js";
import type { AchievementRecord, CreateAchievementInput } from "./achievements.types.js";

export interface AchievementsRepository {
  create(input: CreateAchievementInput): Promise<AchievementRecord>;
  list(): Promise<AchievementRecord[]>;
}

export function createAchievementsRepository(storageDriver: "memory" | "postgres", sql?: Sql) {
  if (storageDriver === "memory") {
    return new MemoryAchievementsRepository();
  }

  if (!sql) {
    throw new Error("A Postgres SQL client is required for the achievements repository.");
  }

  return PostgresAchievementsRepository.fromSql(sql);
}
