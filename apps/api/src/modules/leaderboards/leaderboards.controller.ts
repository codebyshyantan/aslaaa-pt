import type { Request, Response } from "express";

import { weeklyLeaderboardQuerySchema } from "./leaderboards.validation.js";
import type { LeaderboardsService } from "./leaderboards.service.js";
import type { UpdateFeaturedLeaderboardBody } from "./leaderboards.validation.js";

type LeaderboardsControllerDependencies = {
  service: LeaderboardsService;
};

export function createLeaderboardsController({ service }: LeaderboardsControllerDependencies) {
  return {
    getFeaturedOverview: async (_request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: await service.getFeaturedOverview(),
      });
    },

    getWeeklyLeaderboard: async (request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: await service.getWeeklyLeaderboard(weeklyLeaderboardQuerySchema.parse(request.query)),
      });
    },

    updateFeaturedLeaderboard: async (request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: await service.updateFeaturedLeaderboard(request.auth!, request.body as UpdateFeaturedLeaderboardBody),
      });
    },
  };
}
