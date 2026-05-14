import type { PointSystemSettings } from "../../contracts/competition-contract.js";

export interface AutoMergeConfigRecord {
  createdAt: string;
  enabled: boolean;
  favoriteMergeId: string;
  id: string;
  resetTime: string;
  scrimId: string;
}

export interface FeaturedLeaderboardConfigRecord {
  mergeId: string | null;
  scrimId: string | null;
  sortBy: "chickenDinners" | "kills" | "matchesPlayed" | "totalPoints";
  tierId: string | null;
  title: string;
  updatedAt: string;
  updatedByUserId: string | null;
  updatedByUsername: string | null;
  week: string | null;
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

export interface PointSystemSettingsRecord extends PointSystemSettings {
  updatedAt: string;
  updatedByUserId: string | null;
  updatedByUsername: string | null;
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

export interface UpdatePointSystemSettingsInput extends PointSystemSettings {
  expectedUpdatedAt: string | null;
  updatedAt: string;
  updatedByUserId: string | null;
  updatedByUsername: string | null;
}

export interface UpdateFeaturedLeaderboardConfigInput {
  mergeId: string | null;
  scrimId: string | null;
  sortBy: FeaturedLeaderboardConfigRecord["sortBy"];
  tierId: string | null;
  title: string;
  updatedAt: string;
  updatedByUserId: string | null;
  updatedByUsername: string | null;
  week: string | null;
}

export interface AutoMergeExecutionPlan {
  config: AutoMergeConfigRecord;
  pointSystem: PointSystemSettingsRecord;
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
