import type { Request, Response } from "express";

import { ApiError } from "../../lib/http/api-error.js";
import type { ScrimsService } from "./scrims.service.js";
import type {
  CreateGroupBody,
  CreateLobbyBody,
  CreateMergePresetBody,
  CreateScrimBody,
  CreateTierBody,
  MergePreviewBody,
  ReplaceLobbyEntriesBody,
} from "./scrims.validation.js";

type ScrimsControllerDependencies = {
  service: ScrimsService;
};

export function createScrimsController({ service }: ScrimsControllerDependencies) {
  return {
    createGroup: async (request: Request, response: Response) => {
      const payload = request.body as CreateGroupBody;
      const group = await service.createGroup(request.auth!, payload);

      response.status(201).json({
        success: true,
        data: group,
      });
    },

    createLobby: async (request: Request, response: Response) => {
      const payload = request.body as CreateLobbyBody;
      const lobby = await service.createLobby(request.auth!, payload);

      response.status(201).json({
        success: true,
        data: lobby,
      });
    },

    createMergePreset: async (request: Request, response: Response) => {
      const payload = request.body as CreateMergePresetBody;
      const preset = await service.createMergePreset(request.auth!, payload);

      response.status(201).json({
        success: true,
        data: preset,
      });
    },

    createScrim: async (request: Request, response: Response) => {
      const payload = request.body as CreateScrimBody;
      const scrim = await service.createScrim(request.auth!, payload);

      response.status(201).json({
        success: true,
        data: scrim,
      });
    },

    createTier: async (request: Request, response: Response) => {
      const payload = request.body as CreateTierBody;
      const tier = await service.createTier(request.auth!, payload);

      response.status(201).json({
        success: true,
        data: tier,
      });
    },

    getMergePresetStandings: async (request: Request, response: Response) => {
      const presetId = request.params.id;

      if (!presetId || Array.isArray(presetId)) {
        throw new ApiError(400, "INVALID_MERGE_PRESET_ID", "Merge preset id is required.");
      }

      response.status(200).json({
        success: true,
        data: await service.getMergePresetStandings(presetId),
      });
    },

    listState: async (_request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: await service.listState(),
      });
    },

    previewMerge: async (request: Request, response: Response) => {
      const payload = request.body as MergePreviewBody;

      response.status(200).json({
        success: true,
        data: await service.previewMerge(payload),
      });
    },

    replaceLobbyEntries: async (request: Request, response: Response) => {
      const lobbyId = request.params.id;

      if (!lobbyId || Array.isArray(lobbyId)) {
        throw new ApiError(400, "INVALID_LOBBY_ID", "Lobby id is required.");
      }

      const payload = request.body as ReplaceLobbyEntriesBody;
      const entries = await service.replaceLobbyEntries(request.auth!, lobbyId, payload);

      response.status(200).json({
        success: true,
        data: {
          entries,
        },
      });
    },
  };
}
