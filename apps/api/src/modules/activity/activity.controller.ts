import type { Request, Response } from "express";

import type { ActivityService } from "./activity.service.js";

type ActivityControllerDependencies = {
  service: ActivityService;
};

export function createActivityController({ service }: ActivityControllerDependencies) {
  return {
    listRecent: async (request: Request, response: Response) => {
      const rawLimit = typeof request.query.limit === "string" ? Number(request.query.limit) : 20;
      const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;

      response.status(200).json({
        success: true,
        data: {
          logs: await service.listRecent(limit),
        },
      });
    },
  };
}
