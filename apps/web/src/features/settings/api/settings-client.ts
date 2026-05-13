import type { PointSystemSettings } from "@contracts/competition-contract";

import { apiRequest } from "@/lib/http-client";

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

export function fetchAutoMergeConfigs() {
  return apiRequest<{ configs: AutoMergeConfigRecord[] }>("/auto-merge/configs", {
    method: "GET",
  });
}

export function createAutoMergeConfig(payload: {
  enabled: boolean;
  favoriteMergeId: string;
  resetTime: string;
  scrimId: string;
}) {
  return apiRequest<AutoMergeConfigRecord>("/auto-merge/configs", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function fetchExecutionPlan(id: string) {
  return apiRequest<AutoMergeExecutionPlan>(`/auto-merge/configs/${id}/plan`, {
    method: "GET",
  });
}

export function executeAutoMergeConfig(id: string) {
  return apiRequest<AutoMergeExecutionResult>(`/auto-merge/configs/${id}/run`, {
    method: "POST",
  });
}

export function fetchAutoMergeRuns() {
  return apiRequest<{ runs: AutomationRunRecord[] }>("/auto-merge/runs", {
    method: "GET",
  });
}

export function fetchDailySnapshots() {
  return apiRequest<{ snapshots: DailySnapshotRecord[] }>("/auto-merge/snapshots", {
    method: "GET",
  });
}

export function createDailySnapshot(payload: {
  date: string;
  dayName: string;
  mergeId: string;
  scrimId: string;
  standingsJson: Record<string, unknown>;
}) {
  return apiRequest<DailySnapshotRecord>("/auto-merge/snapshots", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function fetchPointSystemSettings() {
  return apiRequest<PointSystemSettings>("/auto-merge/point-system", {
    method: "GET",
  });
}

export function updatePointSystemSettings(payload: PointSystemSettings) {
  return apiRequest<PointSystemSettings>("/auto-merge/point-system", {
    body: JSON.stringify(payload),
    method: "PUT",
  });
}
