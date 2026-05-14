import { apiRequest } from "@/lib/http-client";

export type LeaderboardSortBy = "chickenDinners" | "kills" | "matchesPlayed" | "totalPoints";

export interface FeaturedLeaderboardConfigRecord {
  mergeId: string | null;
  scrimId: string | null;
  sortBy: LeaderboardSortBy;
  tierId: string | null;
  title: string;
  updatedAt: string;
  updatedByUserId: string | null;
  updatedByUsername: string | null;
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
  filters: {
    mergeId: string | null;
    scrimId: string | null;
    sortBy: LeaderboardSortBy;
    tierId: string | null;
    week: string | null;
  };
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

export function fetchFeaturedLeaderboardOverview() {
  return apiRequest<PublicLeaderboardOverview>("/leaderboards/featured", {
    method: "GET",
    skipUnauthorizedHandling: true,
  });
}

export function fetchWeeklyLeaderboard(params: {
  mergeId?: string | null;
  scrimId?: string | null;
  sortBy?: LeaderboardSortBy;
  tierId?: string | null;
  week?: string | null;
}) {
  const searchParams = new URLSearchParams();

  if (params.week) {
    searchParams.set("week", params.week);
  }

  if (params.scrimId) {
    searchParams.set("scrimId", params.scrimId);
  }

  if (params.mergeId) {
    searchParams.set("mergeId", params.mergeId);
  }

  if (params.tierId) {
    searchParams.set("tierId", params.tierId);
  }

  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }

  const query = searchParams.toString();

  return apiRequest<WeeklyLeaderboardResponse>(`/leaderboards/weekly${query ? `?${query}` : ""}`, {
    method: "GET",
  });
}

export function updateFeaturedLeaderboard(payload: {
  mergeId: string | null;
  scrimId: string | null;
  sortBy: LeaderboardSortBy;
  tierId: string | null;
  title: string;
  week: string | null;
}) {
  return apiRequest<FeaturedLeaderboardConfigRecord>("/leaderboards/featured", {
    body: JSON.stringify(payload),
    method: "PUT",
  });
}
