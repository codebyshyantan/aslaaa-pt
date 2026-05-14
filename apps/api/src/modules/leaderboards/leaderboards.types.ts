import type { FeaturedLeaderboardConfigRecord } from "../automation/automation.types.js";

export const leaderboardSortValues = [
  "totalPoints",
  "chickenDinners",
  "kills",
  "matchesPlayed",
] as const;

export type LeaderboardSortBy = (typeof leaderboardSortValues)[number];

export interface WeeklyLeaderboardFilters {
  mergeId: string | null;
  scrimId: string | null;
  sortBy: LeaderboardSortBy;
  tierId: string | null;
  week: string | null;
}

export interface WeeklyLeaderboardEntry {
  chickenDinners: number;
  kills: number;
  matchesPlayed: number;
  rank: number;
  teamName: string;
  totalPoints: number;
}

export interface WeeklyLeaderboardResponse {
  availableWeeks: string[];
  entries: WeeklyLeaderboardEntry[];
  featuredConfig: FeaturedLeaderboardConfigRecord | null;
  filters: WeeklyLeaderboardFilters;
  generatedAt: string;
  snapshotCount: number;
  title: string;
}

export interface PublicLeaderboardOverview {
  featured: WeeklyLeaderboardResponse | null;
  recentHighlights: Array<{
    date: string;
    dayName: string;
    id: string;
    scrimName: string;
    topTeams: WeeklyLeaderboardEntry[];
  }>;
}
