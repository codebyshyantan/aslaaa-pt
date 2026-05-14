import type { JSONValue, Sql } from "postgres";

import { defaultPointSystemSettings, type PointSystemSettings } from "../../../contracts/competition-contract.js";
import { PointSystemStateConflictError, type AutomationRepository } from "../automation.repository.js";
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
} from "../automation.types.js";

type AutoMergeConfigRow = {
  created_at: Date | string;
  enabled: boolean;
  favorite_merge_id: string;
  id: string;
  reset_time: string;
  scrim_id: string;
};

type DailySnapshotRow = {
  created_at: Date | string;
  date: string;
  day_name: string;
  id: string;
  merge_id: string;
  scrim_id: string;
  standings_json: Record<string, unknown>;
};

type AutomationRunRow = {
  config_id: string;
  created_at: Date | string;
  detected_active_records: number;
  id: string;
  merge_id: string;
  run_date: string;
  scrim_id: string;
  snapshot_id: string | null;
  status: AutomationRunRecord["status"];
  summary_json: Record<string, unknown>;
};

type SystemSettingsRow = {
  key: string;
  updated_at: Date | string;
  updated_by_user_id: string | null;
  updated_by_username: string | null;
  value_json: Record<string, unknown>;
};

function toIsoString(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapAutoMergeConfigRow(row: AutoMergeConfigRow): AutoMergeConfigRecord {
  return {
    createdAt: toIsoString(row.created_at),
    enabled: row.enabled,
    favoriteMergeId: row.favorite_merge_id,
    id: row.id,
    resetTime: row.reset_time,
    scrimId: row.scrim_id,
  };
}

function mapDailySnapshotRow(row: DailySnapshotRow): DailySnapshotRecord {
  return {
    createdAt: toIsoString(row.created_at),
    date: row.date,
    dayName: row.day_name,
    id: row.id,
    mergeId: row.merge_id,
    scrimId: row.scrim_id,
    standingsJson: row.standings_json,
  };
}

function mapAutomationRunRow(row: AutomationRunRow): AutomationRunRecord {
  return {
    configId: row.config_id,
    createdAt: toIsoString(row.created_at),
    detectedActiveRecords: row.detected_active_records,
    id: row.id,
    mergeId: row.merge_id,
    runDate: row.run_date,
    scrimId: row.scrim_id,
    snapshotId: row.snapshot_id,
    status: row.status,
    summaryJson: row.summary_json,
  };
}

function normalizePointSystemSettings(value: Record<string, unknown> | null | undefined): PointSystemSettings {
  const killPointValue =
    typeof value?.killPointValue === "number" && Number.isFinite(value.killPointValue)
      ? Math.max(0, Math.trunc(value.killPointValue))
      : defaultPointSystemSettings.killPointValue;
  const positionPoints = Array.isArray(value?.positionPoints)
    ? value.positionPoints
        .filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry))
        .map((entry) => Math.max(0, Math.trunc(entry)))
    : defaultPointSystemSettings.positionPoints;

  return {
    killPointValue,
    positionPoints: positionPoints.length > 0 ? positionPoints : defaultPointSystemSettings.positionPoints,
  };
}

function mapPointSystemSettingsRow(row: SystemSettingsRow | null | undefined): PointSystemSettingsRecord {
  const normalized = normalizePointSystemSettings(row?.value_json);

  return {
    ...normalized,
    updatedAt: row ? toIsoString(row.updated_at) ?? new Date().toISOString() : new Date(0).toISOString(),
    updatedByUserId: row?.updated_by_user_id ?? null,
    updatedByUsername: row?.updated_by_username ?? null,
  };
}

function mapFeaturedLeaderboardConfigRow(
  row: SystemSettingsRow | null | undefined,
): FeaturedLeaderboardConfigRecord | null {
  if (!row) {
    return null;
  }

  return {
    mergeId: typeof row.value_json.mergeId === "string" ? row.value_json.mergeId : null,
    scrimId: typeof row.value_json.scrimId === "string" ? row.value_json.scrimId : null,
    sortBy:
      row.value_json.sortBy === "chickenDinners" ||
      row.value_json.sortBy === "kills" ||
      row.value_json.sortBy === "matchesPlayed" ||
      row.value_json.sortBy === "totalPoints"
        ? row.value_json.sortBy
        : "totalPoints",
    tierId: typeof row.value_json.tierId === "string" ? row.value_json.tierId : null,
    title:
      typeof row.value_json.title === "string" && row.value_json.title.trim().length > 0
        ? row.value_json.title.trim()
        : "Featured Weekly Leaderboard",
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
    updatedByUserId: row.updated_by_user_id,
    updatedByUsername: row.updated_by_username,
    week: typeof row.value_json.week === "string" ? row.value_json.week : null,
  };
}

export class PostgresAutomationRepository implements AutomationRepository {
  private constructor(private readonly sql: Sql) {}

  static fromSql(sql: Sql) {
    return new PostgresAutomationRepository(sql);
  }

  async createAutoMergeConfig(input: CreateAutoMergeConfigInput) {
    const [row] = await this.sql<AutoMergeConfigRow[]>`
      insert into auto_merge_configs (scrim_id, favorite_merge_id, reset_time, enabled, created_at)
      values (${input.scrimId}, ${input.favoriteMergeId}, ${input.resetTime}, ${input.enabled}, ${input.createdAt})
      returning id, scrim_id, favorite_merge_id, reset_time, enabled, created_at
    `;

    if (!row) {
      throw new Error("Failed to create auto merge configuration.");
    }

    return mapAutoMergeConfigRow(row);
  }

  async createAutomationRun(input: CreateAutomationRunInput) {
    const [row] = await this.sql<AutomationRunRow[]>`
      insert into automation_runs (
        config_id,
        scrim_id,
        merge_id,
        run_date,
        status,
        detected_active_records,
        snapshot_id,
        summary_json,
        created_at
      )
      values (
        ${input.configId},
        ${input.scrimId},
        ${input.mergeId},
        ${input.runDate},
        ${input.status},
        ${input.detectedActiveRecords},
        ${input.snapshotId},
        ${this.sql.json(input.summaryJson as JSONValue)},
        ${input.createdAt}
      )
      returning id, config_id, scrim_id, merge_id, run_date, status, detected_active_records, snapshot_id, summary_json, created_at
    `;

    if (!row) {
      throw new Error("Failed to create automation run.");
    }

    return mapAutomationRunRow(row);
  }

  async createDailySnapshot(input: CreateDailySnapshotInput) {
    const [row] = await this.sql<DailySnapshotRow[]>`
      insert into daily_snapshots (scrim_id, merge_id, date, day_name, standings_json, created_at)
      values (
        ${input.scrimId},
        ${input.mergeId},
        ${input.date},
        ${input.dayName},
        ${this.sql.json(input.standingsJson as JSONValue)},
        ${input.createdAt}
      )
      returning id, scrim_id, merge_id, date, day_name, standings_json, created_at
    `;

    if (!row) {
      throw new Error("Failed to create daily snapshot.");
    }

    return mapDailySnapshotRow(row);
  }

  async findAutoMergeConfigById(id: string) {
    const [row] = await this.sql<AutoMergeConfigRow[]>`
      select id, scrim_id, favorite_merge_id, reset_time, enabled, created_at
      from auto_merge_configs
      where id = ${id}
      limit 1
    `;

    return row ? mapAutoMergeConfigRow(row) : null;
  }

  async getFeaturedLeaderboardConfig() {
    const [row] = await this.sql<SystemSettingsRow[]>`
      select key, value_json, updated_at, updated_by_user_id, updated_by_username
      from system_settings
      where key = 'featured-weekly-leaderboard'
      limit 1
    `;

    return mapFeaturedLeaderboardConfigRow(row);
  }

  async getPointSystemSettings() {
    const [row] = await this.sql<SystemSettingsRow[]>`
      select key, value_json, updated_at, updated_by_user_id, updated_by_username
      from system_settings
      where key = 'point-system'
      limit 1
    `;

    return mapPointSystemSettingsRow(row);
  }

  async listAutoMergeConfigs() {
    const rows = await this.sql<AutoMergeConfigRow[]>`
      select id, scrim_id, favorite_merge_id, reset_time, enabled, created_at
      from auto_merge_configs
      order by created_at desc
    `;

    return rows.map(mapAutoMergeConfigRow);
  }

  async listAutomationRuns() {
    const rows = await this.sql<AutomationRunRow[]>`
      select id, config_id, scrim_id, merge_id, run_date, status, detected_active_records, snapshot_id, summary_json, created_at
      from automation_runs
      order by created_at desc
    `;

    return rows.map(mapAutomationRunRow);
  }

  async listDailySnapshots() {
    const rows = await this.sql<DailySnapshotRow[]>`
      select id, scrim_id, merge_id, date, day_name, standings_json, created_at
      from daily_snapshots
      order by created_at desc
    `;

    return rows.map(mapDailySnapshotRow);
  }

  async updateFeaturedLeaderboardConfig(input: UpdateFeaturedLeaderboardConfigInput) {
    const [row] = await this.sql<SystemSettingsRow[]>`
      insert into system_settings (key, value_json, updated_at, updated_by_user_id, updated_by_username)
      values (
        'featured-weekly-leaderboard',
        ${this.sql.json(
          {
            mergeId: input.mergeId,
            scrimId: input.scrimId,
            sortBy: input.sortBy,
            tierId: input.tierId,
            title: input.title,
            week: input.week,
          } as unknown as JSONValue,
        )},
        ${input.updatedAt},
        ${input.updatedByUserId},
        ${input.updatedByUsername}
      )
      on conflict (key)
      do update set
        value_json = excluded.value_json,
        updated_at = excluded.updated_at,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_by_username = excluded.updated_by_username
      returning key, value_json, updated_at, updated_by_user_id, updated_by_username
    `;

    const config = mapFeaturedLeaderboardConfigRow(row);

    if (!config) {
      throw new Error("Failed to update featured leaderboard configuration.");
    }

    return config;
  }

  async updatePointSystemSettings(input: UpdatePointSystemSettingsInput) {
    const normalized = normalizePointSystemSettings({
      killPointValue: input.killPointValue,
      positionPoints: input.positionPoints,
    });

    return this.sql.begin(async (transaction) => {
      const [currentRow] = await transaction<SystemSettingsRow[]>`
        select key, value_json, updated_at, updated_by_user_id, updated_by_username
        from system_settings
        where key = 'point-system'
        limit 1
        for update
      `;

      const currentSettings = mapPointSystemSettingsRow(currentRow);

      if (input.expectedUpdatedAt && currentSettings.updatedAt !== input.expectedUpdatedAt) {
        throw new PointSystemStateConflictError(currentSettings, input.expectedUpdatedAt);
      }

      const [updatedRow] = await transaction<SystemSettingsRow[]>`
        insert into system_settings (key, value_json, updated_at, updated_by_user_id, updated_by_username)
        values (
          'point-system',
          ${this.sql.json(normalized as unknown as JSONValue)},
          ${input.updatedAt},
          ${input.updatedByUserId},
          ${input.updatedByUsername}
        )
        on conflict (key)
        do update set
          value_json = excluded.value_json,
          updated_at = excluded.updated_at,
          updated_by_user_id = excluded.updated_by_user_id,
          updated_by_username = excluded.updated_by_username
        returning key, value_json, updated_at, updated_by_user_id, updated_by_username
      `;

      return mapPointSystemSettingsRow(updatedRow);
    });
  }
}
