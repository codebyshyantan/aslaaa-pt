import type { Request, Response } from "express";

import type { ImportTeamsBody } from "./teams.validation.js";
import type { TeamsService } from "./teams.service.js";

type TeamsControllerDependencies = {
  service: TeamsService;
};

export function createTeamsController({ service }: TeamsControllerDependencies) {
  return {
    importTeams: async (request: Request, response: Response) => {
      const payload = request.body as ImportTeamsBody;
      const result = await service.importTeams(request.auth!, payload.rawInput);

      response.status(200).json({
        success: true,
        data: result,
      });
    },

    listTeams: async (_request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: {
          teams: await service.listTeams(),
        },
      });
    },
  };
}
