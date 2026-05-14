import { z } from "zod";

import { leaderboardSortValues } from "./leaderboards.types.js";

export const weeklyLeaderboardQuerySchema = z.object({
  mergeId: z.string().uuid().optional(),
  scrimId: z.string().uuid().optional(),
  sortBy: z.enum(leaderboardSortValues).optional().default("totalPoints"),
  tierId: z.string().uuid().optional(),
  week: z.string().regex(/^\d{4}-W\d{2}$/).optional(),
});

export const updateFeaturedLeaderboardSchema = z.object({
  mergeId: z.string().uuid().nullable().default(null),
  scrimId: z.string().uuid().nullable().default(null),
  sortBy: z.enum(leaderboardSortValues).default("totalPoints"),
  tierId: z.string().uuid().nullable().default(null),
  title: z.string().trim().min(3).max(80).default("Featured Weekly Leaderboard"),
  week: z.string().regex(/^\d{4}-W\d{2}$/).nullable().default(null),
});

export type WeeklyLeaderboardQuery = z.infer<typeof weeklyLeaderboardQuerySchema>;
export type UpdateFeaturedLeaderboardBody = z.infer<typeof updateFeaturedLeaderboardSchema>;
