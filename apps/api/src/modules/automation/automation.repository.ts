import type { Sql } from "postgres";

import type { PointSystemSettings } from "../../contracts/competition-contract.js";
import { MemoryAutomationRepository } from "./repositories/memory-automation-repository.js";
import { PostgresAutomationRepository } from "./repositories/postgres-automation-repository.js";
import type {
  AutomationRunRecord,
  AutoMergeConfigRecord,
  CreateAutoMergeConfigInput,
  CreateAutomationRunInput,
  CreateDailySnapshotInput,
  DailySnapshotRecord,
} from "./automation.types.js";

export interface AutomationRepository {
  createAutoMergeConfig(input: CreateAutoMergeConfigInput): Promise<AutoMergeConfigRecord>;
  createAutomationRun(input: CreateAutomationRunInput): Promise<AutomationRunRecord>;
  createDailySnapshot(input: CreateDailySnapshotInput): Promise<DailySnapshotRecord>;
  findAutoMergeConfigById(id: string): Promise<AutoMergeConfigRecord | null>;
  getPointSystemSettings(): Promise<PointSystemSettings>;
  listAutoMergeConfigs(): Promise<AutoMergeConfigRecord[]>;
  listAutomationRuns(): Promise<AutomationRunRecord[]>;
  listDailySnapshots(): Promise<DailySnapshotRecord[]>;
  updatePointSystemSettings(input: PointSystemSettings): Promise<PointSystemSettings>;
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
