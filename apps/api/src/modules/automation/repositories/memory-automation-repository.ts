import { randomUUID } from "node:crypto";

import { ApiError } from "../../../lib/http/api-error.js";
import { defaultPointSystemSettings, type PointSystemSettings } from "../../../contracts/competition-contract.js";
import type { AutomationRepository } from "../automation.repository.js";
import type {
  AutomationRunRecord,
  AutoMergeConfigRecord,
  CreateAutoMergeConfigInput,
  CreateAutomationRunInput,
  CreateDailySnapshotInput,
  DailySnapshotRecord,
} from "../automation.types.js";

export class MemoryAutomationRepository implements AutomationRepository {
  private readonly autoMergeConfigs = new Map<string, AutoMergeConfigRecord>();
  private readonly automationRuns = new Map<string, AutomationRunRecord>();
  private readonly dailySnapshots = new Map<string, DailySnapshotRecord>();
  private pointSystemSettings: PointSystemSettings = structuredClone(defaultPointSystemSettings);

  async createAutoMergeConfig(input: CreateAutoMergeConfigInput) {
    for (const config of this.autoMergeConfigs.values()) {
      if (config.scrimId === input.scrimId) {
        throw new ApiError(
          409,
          "AUTO_MERGE_CONFIG_EXISTS",
          "An auto merge configuration already exists for this scrim.",
        );
      }
    }

    const config: AutoMergeConfigRecord = {
      id: randomUUID(),
      ...input,
    };

    this.autoMergeConfigs.set(config.id, config);
    return structuredClone(config);
  }

  async createAutomationRun(input: CreateAutomationRunInput) {
    for (const run of this.automationRuns.values()) {
      if (run.configId === input.configId && run.runDate === input.runDate) {
        throw new ApiError(
          409,
          "AUTO_MERGE_ALREADY_EXECUTED",
          "This auto merge configuration has already executed for the selected date.",
        );
      }
    }

    const run: AutomationRunRecord = {
      id: randomUUID(),
      ...input,
    };

    this.automationRuns.set(run.id, run);
    return structuredClone(run);
  }

  async createDailySnapshot(input: CreateDailySnapshotInput) {
    for (const snapshot of this.dailySnapshots.values()) {
      if (snapshot.scrimId === input.scrimId && snapshot.date === input.date) {
        throw new ApiError(
          409,
          "DAILY_SNAPSHOT_EXISTS",
          "A daily snapshot already exists for this scrim and date.",
        );
      }
    }

    const snapshot: DailySnapshotRecord = {
      id: randomUUID(),
      ...input,
    };

    this.dailySnapshots.set(snapshot.id, snapshot);
    return structuredClone(snapshot);
  }

  async findAutoMergeConfigById(id: string) {
    const config = this.autoMergeConfigs.get(id);
    return config ? structuredClone(config) : null;
  }

  async getPointSystemSettings() {
    return structuredClone(this.pointSystemSettings);
  }

  async listAutoMergeConfigs() {
    return [...this.autoMergeConfigs.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((config) => structuredClone(config));
  }

  async listAutomationRuns() {
    return [...this.automationRuns.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((run) => structuredClone(run));
  }

  async listDailySnapshots() {
    return [...this.dailySnapshots.values()]
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((snapshot) => structuredClone(snapshot));
  }

  async updatePointSystemSettings(input: PointSystemSettings) {
    this.pointSystemSettings = structuredClone(input);
    return structuredClone(this.pointSystemSettings);
  }
}
