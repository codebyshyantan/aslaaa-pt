import type { Sql } from "postgres";

import { MemoryAutomationRepository } from "./repositories/memory-automation-repository.js";
import { PostgresAutomationRepository } from "./repositories/postgres-automation-repository.js";
import type {
  AutomationRunRecord,
  AutoMergeConfigRecord,
  CreateAutoMergeConfigInput,
  CreateAutomationRunInput,
  CreateDailySnapshotInput,
  DailySnapshotRecord,
  FeaturedLeaderboardConfigRecord,
  PointSystemSettingsRecord,
  UpdateFeaturedLeaderboardConfigInput,
  UpdatePointSystemSettingsInput,
} from "./automation.types.js";

export class PointSystemStateConflictError extends Error {
  constructor(
    public readonly currentSettings: PointSystemSettingsRecord,
    public readonly expectedUpdatedAt: string | null,
  ) {
    super("Point system state conflict");
    this.name = "PointSystemStateConflictError";
  }
}

export interface AutomationRepository {
  createAutoMergeConfig(input: CreateAutoMergeConfigInput): Promise<AutoMergeConfigRecord>;
  createAutomationRun(input: CreateAutomationRunInput): Promise<AutomationRunRecord>;
  createDailySnapshot(input: CreateDailySnapshotInput): Promise<DailySnapshotRecord>;
  findAutoMergeConfigById(id: string): Promise<AutoMergeConfigRecord | null>;
  getFeaturedLeaderboardConfig(): Promise<FeaturedLeaderboardConfigRecord | null>;
  getPointSystemSettings(): Promise<PointSystemSettingsRecord>;
  listAutoMergeConfigs(): Promise<AutoMergeConfigRecord[]>;
  listAutomationRuns(): Promise<AutomationRunRecord[]>;
  listDailySnapshots(): Promise<DailySnapshotRecord[]>;
  updateFeaturedLeaderboardConfig(input: UpdateFeaturedLeaderboardConfigInput): Promise<FeaturedLeaderboardConfigRecord>;
  updatePointSystemSettings(input: UpdatePointSystemSettingsInput): Promise<PointSystemSettingsRecord>;
}

export function createAutomationRepository(storageDriver: "memory" | "postgres", sql?: Sql) {
  if (storageDriver === "memory") {
    return new MemoryAutomationRepository();
  }

  if (!sql) {
    throw new Error("A Postgres SQL client is required for the automation repository.");
  }

  return PostgresAutomationRepository.fromSql(sql);
}
