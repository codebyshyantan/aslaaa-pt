import { ApiError } from "../../lib/http/api-error.js";
import type { AuthenticatedRequestContext } from "../auth/auth.types.js";
import type { AutomationRepository } from "../automation/automation.repository.js";
import type {
  DailySnapshotRecord,
  FeaturedLeaderboardConfigRecord,
} from "../automation/automation.types.js";
import type { ScrimsRepository } from "../scrims/scrims.repository.js";
import type { ScrimsState } from "../scrims/scrims.types.js";
import type { PublicLeaderboardOverview, WeeklyLeaderboardEntry, WeeklyLeaderboardFilters } from "./leaderboards.types.js";
import type { UpdateFeaturedLeaderboardBody, WeeklyLeaderboardQuery } from "./leaderboards.validation.js";

type LeaderboardsServiceDependencies = {
  automationRepository: AutomationRepository;
  now?: () => Date;
  scrimsRepository: ScrimsRepository;
};

type SnapshotLeaderboardEntry = {
  chickenDinners: number;
  kills: number;
  matchesPlayed: number;
  teamName: string;
  totalPoints: number;
};

type SnapshotTeamRecord = {
  chickenDinners?: number;
  kills: number;
  matchesPlayed?: number;
  teamName: string;
  totalPoints: number;
};

type SnapshotLobbyRecord = {
  id: string;
};

function toIsoWeekKey(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  const target = new Date(date.valueOf());
  const dayNumber = (date.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  const weekNumber = 1 + Math.round((target.valueOf() - firstThursday.valueOf()) / 604800000);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function parseSnapshotTeams(snapshot: DailySnapshotRecord): SnapshotLeaderboardEntry[] {
  const teams = snapshot.standingsJson.teams;

  if (!Array.isArray(teams)) {
    return [];
  }

  return teams
    .filter(
      (entry): entry is SnapshotTeamRecord =>
        typeof entry === "object" &&
        entry !== null &&
        "teamName" in entry &&
        typeof entry.teamName === "string" &&
        "totalPoints" in entry &&
        typeof entry.totalPoints === "number" &&
        "kills" in entry &&
        typeof entry.kills === "number",
    )
    .map((entry) => ({
      chickenDinners: typeof entry.chickenDinners === "number" ? entry.chickenDinners : 0,
      kills: entry.kills,
      matchesPlayed: typeof entry.matchesPlayed === "number" ? entry.matchesPlayed : 1,
      teamName: entry.teamName,
      totalPoints: entry.totalPoints,
    }));
}

function parseSnapshotLobbyIds(snapshot: DailySnapshotRecord) {
  const lobbies = snapshot.standingsJson.lobbies;

  if (!Array.isArray(lobbies)) {
    return [];
  }

  return lobbies
    .filter(
      (entry): entry is SnapshotLobbyRecord =>
        typeof entry === "object" && entry !== null && "id" in entry && typeof entry.id === "string",
    )
    .map((entry) => entry.id);
}

function compareEntries(sortBy: WeeklyLeaderboardFilters["sortBy"]) {
  return (left: WeeklyLeaderboardEntry, right: WeeklyLeaderboardEntry) => {
    if (right[sortBy] !== left[sortBy]) {
      return right[sortBy] - left[sortBy];
    }

    if (right.totalPoints !== left.totalPoints) {
      return right.totalPoints - left.totalPoints;
    }

    if (right.chickenDinners !== left.chickenDinners) {
      return right.chickenDinners - left.chickenDinners;
    }

    if (right.kills !== left.kills) {
      return right.kills - left.kills;
    }

    if (right.matchesPlayed !== left.matchesPlayed) {
      return right.matchesPlayed - left.matchesPlayed;
    }

    return left.teamName.localeCompare(right.teamName);
  };
}

function buildLobbyTierMap(state: ScrimsState) {
  const groupTierMap = new Map(state.groups.map((group) => [group.id, group.tierId]));
  return new Map(
    state.lobbies.map((lobby) => [lobby.id, groupTierMap.get(lobby.groupId) ?? null] as const),
  );
}

function buildScrimNameMap(state: ScrimsState) {
  return new Map(state.scrims.map((scrim) => [scrim.id, scrim.name]));
}

export class LeaderboardsService {
  constructor(
    private readonly automationRepository: AutomationRepository,
    private readonly scrimsRepository: ScrimsRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  static create({ automationRepository, now, scrimsRepository }: LeaderboardsServiceDependencies) {
    return new LeaderboardsService(automationRepository, scrimsRepository, now);
  }

  async getFeaturedOverview(): Promise<PublicLeaderboardOverview> {
    const [featuredConfig, snapshots, state] = await Promise.all([
      this.automationRepository.getFeaturedLeaderboardConfig(),
      this.automationRepository.listDailySnapshots(),
      this.scrimsRepository.listState(),
    ]);

    const featured = snapshots.length
      ? this.buildLeaderboardResponse(state, snapshots, {
          mergeId: featuredConfig?.mergeId ?? null,
          scrimId: featuredConfig?.scrimId ?? null,
          sortBy: featuredConfig?.sortBy ?? "totalPoints",
          tierId: featuredConfig?.tierId ?? null,
          week: featuredConfig?.week ?? null,
        }, featuredConfig)
      : null;

    const scrimNameMap = buildScrimNameMap(state);
    const recentHighlights = [...snapshots]
      .sort((left, right) => `${right.date}-${right.createdAt}`.localeCompare(`${left.date}-${left.createdAt}`))
      .slice(0, 3)
      .map((snapshot) => ({
        date: snapshot.date,
        dayName: snapshot.dayName,
        id: snapshot.id,
        scrimName: scrimNameMap.get(snapshot.scrimId) ?? snapshot.scrimId,
        topTeams: this.aggregateEntries([snapshot], "totalPoints").slice(0, 3),
      }));

    return {
      featured,
      recentHighlights,
    };
  }

  async getWeeklyLeaderboard(query: WeeklyLeaderboardQuery) {
    const [featuredConfig, snapshots, state] = await Promise.all([
      this.automationRepository.getFeaturedLeaderboardConfig(),
      this.automationRepository.listDailySnapshots(),
      this.scrimsRepository.listState(),
    ]);

    return this.buildLeaderboardResponse(
      state,
      snapshots,
      {
        mergeId: query.mergeId ?? null,
        scrimId: query.scrimId ?? null,
        sortBy: query.sortBy,
        tierId: query.tierId ?? null,
        week: query.week ?? null,
      },
      featuredConfig,
    );
  }

  async updateFeaturedLeaderboard(actor: AuthenticatedRequestContext, payload: UpdateFeaturedLeaderboardBody) {
    const state = await this.scrimsRepository.listState();

    if (payload.scrimId && !state.scrims.some((scrim) => scrim.id === payload.scrimId)) {
      throw new ApiError(400, "SCRIM_NOT_FOUND", "Selected scrim was not found for the featured leaderboard.");
    }

    if (payload.mergeId && !state.mergePresets.some((preset) => preset.id === payload.mergeId)) {
      throw new ApiError(400, "MERGE_PRESET_NOT_FOUND", "Selected merge preset was not found.");
    }

    if (payload.tierId && !state.tiers.some((tier) => tier.id === payload.tierId)) {
      throw new ApiError(400, "TIER_NOT_FOUND", "Selected tier was not found.");
    }

    return this.automationRepository.updateFeaturedLeaderboardConfig({
      ...payload,
      updatedAt: this.now().toISOString(),
      updatedByUserId: actor.user.id,
      updatedByUsername: actor.user.username,
    });
  }

  private buildLeaderboardResponse(
    state: ScrimsState,
    snapshots: DailySnapshotRecord[],
    requestedFilters: WeeklyLeaderboardFilters,
    featuredConfig: FeaturedLeaderboardConfigRecord | null,
  ) {
    const availableWeeks = [...new Set(snapshots.map((snapshot) => toIsoWeekKey(snapshot.date)))]
      .sort((left, right) => right.localeCompare(left));
    const filters: WeeklyLeaderboardFilters = {
      ...requestedFilters,
      week: requestedFilters.week ?? availableWeeks[0] ?? null,
    };
    const lobbyTierMap = buildLobbyTierMap(state);
    const filteredSnapshots = snapshots.filter((snapshot) => {
      if (filters.week && toIsoWeekKey(snapshot.date) !== filters.week) {
        return false;
      }

      if (filters.scrimId && snapshot.scrimId !== filters.scrimId) {
        return false;
      }

      if (filters.mergeId && snapshot.mergeId !== filters.mergeId) {
        return false;
      }

      if (filters.tierId) {
        const snapshotLobbyIds = parseSnapshotLobbyIds(snapshot);
        if (!snapshotLobbyIds.some((lobbyId) => lobbyTierMap.get(lobbyId) === filters.tierId)) {
          return false;
        }
      }

      return true;
    });

    const title =
      featuredConfig?.title?.trim() ||
      (filters.week ? `Weekly Leaderboard ${filters.week}` : "Weekly Leaderboard");

    return {
      availableWeeks,
      entries: this.aggregateEntries(filteredSnapshots, filters.sortBy),
      featuredConfig,
      filters,
      generatedAt: this.now().toISOString(),
      snapshotCount: filteredSnapshots.length,
      title,
    };
  }

  private aggregateEntries(
    snapshots: DailySnapshotRecord[],
    sortBy: WeeklyLeaderboardFilters["sortBy"],
  ): WeeklyLeaderboardEntry[] {
    const aggregate = new Map<string, WeeklyLeaderboardEntry>();

    for (const snapshot of snapshots) {
      for (const entry of parseSnapshotTeams(snapshot)) {
        const normalizedName = entry.teamName.toUpperCase();
        const current = aggregate.get(normalizedName);

        if (!current) {
          aggregate.set(normalizedName, {
            chickenDinners: entry.chickenDinners,
            kills: entry.kills,
            matchesPlayed: entry.matchesPlayed,
            rank: 0,
            teamName: entry.teamName,
            totalPoints: entry.totalPoints,
          });
          continue;
        }

        current.chickenDinners += entry.chickenDinners;
        current.kills += entry.kills;
        current.matchesPlayed += entry.matchesPlayed;
        current.totalPoints += entry.totalPoints;
      }
    }

    return [...aggregate.values()]
      .sort(compareEntries(sortBy))
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));
  }
}
