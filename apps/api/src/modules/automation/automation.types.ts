import type { PointSystemSettings } from "../../contracts/competition-contract.js";

export interface AutoMergeConfigRecord {
  createdAt: string;
  enabled: boolean;
  favoriteMergeId: string;
  id: string;
  resetTime: string;
  scrimId: string;
}

export interface DailySnapshotRecord {
  createdAt: string;
  date: string;
  dayName: string;
  id: string;
  mergeId: string;
  scrimId: string;
  standingsJson: Record<string, unknown>;
}

export interface AutomationRunRecord {
  configId: string;
  createdAt: string;
  detectedActiveRecords: number;
  id: string;
  mergeId: string;
  runDate: string;
  scrimId: string;
  snapshotId: string | null;
  status: "COMPLETED" | "FAILED" | "SKIPPED";
  summaryJson: Record<string, unknown>;
}

export interface CreateAutoMergeConfigInput {
  createdAt: string;
  enabled: boolean;
  favoriteMergeId: string;
  resetTime: string;
  scrimId: string;
}

export interface CreateDailySnapshotInput {
  createdAt: string;
  date: string;
  dayName: string;
  mergeId: string;
  scrimId: string;
  standingsJson: Record<string, unknown>;
}

export interface CreateAutomationRunInput {
  configId: string;
  createdAt: string;
  detectedActiveRecords: number;
  mergeId: string;
  runDate: string;
  scrimId: string;
  snapshotId: string | null;
  status: AutomationRunRecord["status"];
  summaryJson: Record<string, unknown>;
}

export interface AutoMergeExecutionPlan {
  config: AutoMergeConfigRecord;
  pointSystem: PointSystemSettings;
  resetArchitecture: Array<{
    detail: string;
    step: number;
    title: string;
  }>;
}

export interface AutoMergeExecutionResult {
  config: AutoMergeConfigRecord;
  run: AutomationRunRecord;
  snapshot: DailySnapshotRecord | null;
}
