import type { Request, Response } from "express";

import type { CreateAchievementBody } from "./achievements.validation.js";
import type { AchievementsService } from "./achievements.service.js";

type AchievementsControllerDependencies = {
  service: AchievementsService;
};

export function createAchievementsController({ service }: AchievementsControllerDependencies) {
  return {
    createAchievement: async (request: Request, response: Response) => {
      const payload = request.body as CreateAchievementBody;
      const achievement = await service.createAchievement(request.auth!, payload);

      response.status(201).json({
        success: true,
        data: achievement,
      });
    },

    listAchievements: async (_request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: {
          achievements: await service.listAchievements(),
        },
      });
    },
  };
}
