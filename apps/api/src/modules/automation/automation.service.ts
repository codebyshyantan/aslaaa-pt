import { mergeStandings } from "../../contracts/competition-contract.js";
import { ApiError } from "../../lib/http/api-error.js";
import { isPostgresUniqueViolation } from "../../persistence/postgres-errors.js";
import type { CreateActivityLogInput } from "../activity/activity.types.js";
import type { AuthenticatedRequestContext } from "../auth/auth.types.js";
import type { ScrimsRepository } from "../scrims/scrims.repository.js";
import { PointSystemStateConflictError, type AutomationRepository } from "./automation.repository.js";
import type {
  CreateAutoMergeConfigBody,
  CreateDailySnapshotBody,
  UpdatePointSystemBody,
} from "./automation.validation.js";

type AutomationServiceDependencies = {
  now?: () => Date;
  recordAutomaticAchievement?: (
    actor: AuthenticatedRequestContext,
    title: string,
    description: string,
  ) => Promise<unknown>;
  recordActivity?: (input: CreateActivityLogInput) => Promise<unknown>;
  repository: AutomationRepository;
  scrimsRepository: ScrimsRepository;
};

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toDayName(value: Date) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(value);
}

function toTimeKey(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

export class AutomationService {
  constructor(
    private readonly repository: AutomationRepository,
    private readonly scrimsRepository: ScrimsRepository,
    private readonly recordAutomaticAchievement: AutomationServiceDependencies["recordAutomaticAchievement"],
    private readonly recordActivity?: (input: CreateActivityLogInput) => Promise<unknown>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  static create({
    now,
    recordActivity,
    recordAutomaticAchievement,
    repository,
    scrimsRepository,
  }: AutomationServiceDependencies) {
    return new AutomationService(repository, scrimsRepository, recordAutomaticAchievement, recordActivity, now);
  }

  async createAutoMergeConfig(payload: CreateAutoMergeConfigBody) {
    const preset = await this.scrimsRepository.findMergePresetById(payload.favoriteMergeId);

    if (!preset || preset.scrimId !== payload.scrimId) {
      throw new ApiError(
        400,
        "INVALID_FAVORITE_MERGE",
        "Favorite merge preset must exist and belong to the selected scrim.",
      );
    }

    try {
      return await this.repository.createAutoMergeConfig({
        createdAt: this.now().toISOString(),
        enabled: payload.enabled,
        favoriteMergeId: payload.favoriteMergeId,
        resetTime: payload.resetTime,
        scrimId: payload.scrimId,
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error, ["uq_auto_merge_configs_scrim_id"])) {
        throw new ApiError(
          409,
          "AUTO_MERGE_CONFIG_EXISTS",
          "An auto merge configuration already exists for this scrim.",
        );
      }

      throw error;
    }
  }

  async createDailySnapshot(payload: CreateDailySnapshotBody) {
    const preset = await this.scrimsRepository.findMergePresetById(payload.mergeId);

    if (!preset || preset.scrimId !== payload.scrimId) {
      throw new ApiError(
        400,
        "INVALID_SNAPSHOT_MERGE",
        "Snapshot merge preset must exist and belong to the selected scrim.",
      );
    }

    try {
      return await this.repository.createDailySnapshot({
        createdAt: this.now().toISOString(),
        date: payload.date,
        dayName: payload.dayName,
        mergeId: payload.mergeId,
        scrimId: payload.scrimId,
        standingsJson: payload.standingsJson,
      });
    } catch (error) {
      if (isPostgresUniqueViolation(error, ["uq_daily_snapshots_scrim_date"])) {
        throw new ApiError(
          409,
          "DAILY_SNAPSHOT_EXISTS",
          "A daily snapshot already exists for this scrim and date.",
        );
      }

      throw error;
    }
  }

  async executeConfig(configId: string, actor: AuthenticatedRequestContext | null) {
    const config = await this.repository.findAutoMergeConfigById(configId);

    if (!config) {
      throw new ApiError(404, "AUTO_MERGE_CONFIG_NOT_FOUND", "Auto merge configuration not found.");
    }

    const pointSystem = await this.repository.getPointSystemSettings();
    const sourceResult = await this.scrimsRepository.getMergeSourceCollectionsByPresetId(config.favoriteMergeId);

    if (!sourceResult.preset) {
      throw new ApiError(404, "MERGE_PRESET_NOT_FOUND", "Favorite merge preset not found.");
    }

    const currentDate = toIsoDate(this.now());
    const currentDayName = toDayName(this.now());
    const detectedActiveRecords = sourceResult.collections.reduce(
      (total, collection) => total + collection.entries.length,
      0,
    );

    if (!config.enabled) {
      const run = await this.createRunRecord({
        configId: config.id,
        createdAt: this.now().toISOString(),
        detectedActiveRecords,
        mergeId: config.favoriteMergeId,
        runDate: currentDate,
        scrimId: config.scrimId,
        snapshotId: null,
        status: "SKIPPED",
        summaryJson: {
          reason: "CONFIG_DISABLED",
        },
      });

      await this.writeActivity(actor, run, "Auto merge skipped because the configuration is disabled.");

      return {
        config,
        run,
        snapshot: null,
      };
    }

    if (detectedActiveRecords === 0) {
      const run = await this.createRunRecord({
        configId: config.id,
        createdAt: this.now().toISOString(),
        detectedActiveRecords,
        mergeId: config.favoriteMergeId,
        runDate: currentDate,
        scrimId: config.scrimId,
        snapshotId: null,
        status: "SKIPPED",
        summaryJson: {
          reason: "NO_ACTIVE_LOBBY_DATA",
        },
      });

      await this.writeActivity(actor, run, "Auto merge skipped because no active lobby data was found.");

      return {
        config,
        run,
        snapshot: null,
      };
    }

    const standings = mergeStandings(sourceResult.collections, pointSystem);
    const snapshot = await this.createDailySnapshot({
      date: currentDate,
      dayName: currentDayName,
      mergeId: config.favoriteMergeId,
      scrimId: config.scrimId,
      standingsJson: {
        generatedAt: this.now().toISOString(),
        lobbies: sourceResult.collections.map((collection) => ({
          entryCount: collection.entries.length,
          id: collection.lobbyId,
          name: collection.lobbyName,
        })),
        pointSystem,
        presetId: config.favoriteMergeId,
        teams: standings,
      },
    });

    await this.scrimsRepository.clearLobbyEntriesForScrim(config.scrimId);

    const run = await this.createRunRecord({
      configId: config.id,
      createdAt: this.now().toISOString(),
      detectedActiveRecords,
      mergeId: config.favoriteMergeId,
      runDate: currentDate,
      scrimId: config.scrimId,
      snapshotId: snapshot.id,
      status: "COMPLETED",
      summaryJson: {
        snapshotId: snapshot.id,
        standingsCount: standings.length,
      },
    });

    const scrim = await this.scrimsRepository.findScrimById(config.scrimId);
    if (actor && this.recordAutomaticAchievement) {
      await this.recordAutomaticAchievement(
        actor,
        `Daily reset archived ${scrim?.name ?? config.scrimId}`,
        `Favorite merge ${sourceResult.preset.name} generated ${standings.length} ranked team records and cleared ${detectedActiveRecords} live lobby rows.`,
      );
    }

    await this.writeActivity(
      actor,
      run,
      `Auto merge archived ${standings.length} standings rows and cleared ${detectedActiveRecords} live lobby entries.`,
    );

    return {
      config,
      run,
      snapshot,
    };
  }

  async runDueConfigs() {
    const configs = await this.repository.listAutoMergeConfigs();
    const now = this.now();
    const currentTimeKey = toTimeKey(now);
    const results = [];

    for (const config of configs) {
      if (!config.enabled || config.resetTime !== currentTimeKey) {
        continue;
      }

      try {
        results.push(await this.executeConfig(config.id, null));
      } catch (error) {
        if (error instanceof ApiError && error.code === "AUTO_MERGE_ALREADY_EXECUTED") {
          continue;
        }

        throw error;
      }
    }

    return results;
  }

  async getExecutionPlan(configId: string) {
    const config = await this.repository.findAutoMergeConfigById(configId);

    if (!config) {
      throw new ApiError(404, "AUTO_MERGE_CONFIG_NOT_FOUND", "Auto merge configuration not found.");
    }

    const pointSystem = await this.repository.getPointSystemSettings();
    const preset = await this.scrimsRepository.findMergePresetById(config.favoriteMergeId);
    const sourceResult = preset
      ? await this.scrimsRepository.getMergeSourceCollectionsByPresetId(config.favoriteMergeId)
      : { collections: [], preset: null };
    const detectedActiveRecords = sourceResult.collections.reduce(
      (total, collection) => total + collection.entries.length,
      0,
    );

    return {
      config,
      pointSystem,
      resetArchitecture: [
        {
          step: 1,
          title: "Check configuration state",
          detail: config.enabled ? "Configuration is enabled and eligible to run." : "Configuration is disabled and will be skipped.",
        },
        {
          step: 2,
          title: "Resolve favorite merge preset",
          detail: sourceResult.preset
            ? `Favorite preset ${sourceResult.preset.name} is linked to ${sourceResult.collections.length} lobbies.`
            : "Favorite merge preset is missing and must be repaired before execution.",
        },
        {
          step: 3,
          title: "Collect lobby standings",
          detail: `${detectedActiveRecords} active lobby rows are currently available for snapshot generation.`,
        },
        {
          step: 4,
          title: "Apply point system",
          detail: `Kills are worth ${pointSystem.killPointValue} point(s). Position points currently cover ${pointSystem.positionPoints.length} finishing slots.`,
        },
        {
          step: 5,
          title: "Archive immutable snapshot",
          detail: "Merged standings are persisted into daily_snapshots before any live lobby data is cleared.",
        },
        {
          step: 6,
          title: "Reset live lobby state",
          detail: "All active lobby entries under the configured scrim are cleared after archival completes.",
        },
      ],
    };
  }

  async getPointSystemSettings() {
    return this.repository.getPointSystemSettings();
  }

  async listAutoMergeConfigs() {
    return this.repository.listAutoMergeConfigs();
  }

  async listAutomationRuns() {
    return this.repository.listAutomationRuns();
  }

  async listDailySnapshots() {
    return this.repository.listDailySnapshots();
  }

  async updatePointSystemSettings(actor: AuthenticatedRequestContext, payload: UpdatePointSystemBody) {
    try {
      return await this.repository.updatePointSystemSettings({
        expectedUpdatedAt: payload.expectedUpdatedAt,
        killPointValue: payload.killPointValue,
        positionPoints: payload.positionPoints,
        updatedAt: this.now().toISOString(),
        updatedByUserId: actor.user.id,
        updatedByUsername: actor.user.username,
      });
    } catch (error) {
      if (error instanceof PointSystemStateConflictError) {
        throw new ApiError(
          409,
          "POINT_SYSTEM_STALE_STATE",
          "Point system settings were updated by another user. Refresh before saving again.",
          {
            currentUpdatedAt: error.currentSettings.updatedAt,
            expectedUpdatedAt: error.expectedUpdatedAt,
            lastUpdatedByUsername: error.currentSettings.updatedByUsername,
          },
        );
      }

      throw error;
    }
  }

  private async createRunRecord(input: {
    configId: string;
    createdAt: string;
    detectedActiveRecords: number;
    mergeId: string;
    runDate: string;
    scrimId: string;
    snapshotId: string | null;
    status: "COMPLETED" | "FAILED" | "SKIPPED";
    summaryJson: Record<string, unknown>;
  }) {
    try {
      return await this.repository.createAutomationRun(input);
    } catch (error) {
      if (isPostgresUniqueViolation(error, ["uq_automation_runs_config_date"])) {
        throw new ApiError(
          409,
          "AUTO_MERGE_ALREADY_EXECUTED",
          "This auto merge configuration has already executed for the selected date.",
        );
      }

      throw error;
    }
  }

  private async writeActivity(
    actor: AuthenticatedRequestContext | null,
    run: Awaited<ReturnType<AutomationService["createRunRecord"]>>,
    description: string,
  ) {
    if (!this.recordActivity) {
      return;
    }

    await this.recordActivity({
      action: "RUN_AUTO_MERGE",
      actorRole: actor?.user.role ?? null,
      actorUserId: actor?.user.id ?? null,
      actorUsername: actor?.user.username ?? "SYSTEM",
      createdAt: this.now().toISOString(),
      description,
      module: "AUTOMATION",
      payloadJson: {
        configId: run.configId,
        detectedActiveRecords: run.detectedActiveRecords,
        mergeId: run.mergeId,
        runDate: run.runDate,
        snapshotId: run.snapshotId,
        status: run.status,
      },
      targetId: run.id,
      targetType: "AUTOMATION_RUN",
    });
  }
}
