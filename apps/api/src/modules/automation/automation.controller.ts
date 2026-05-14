import type { Request, Response } from "express";

import { ApiError } from "../../lib/http/api-error.js";
import type { AutomationService } from "./automation.service.js";
import type {
  CreateAutoMergeConfigBody,
  CreateDailySnapshotBody,
  UpdatePointSystemBody,
} from "./automation.validation.js";

type AutomationControllerDependencies = {
  service: AutomationService;
};

export function createAutomationController({ service }: AutomationControllerDependencies) {
  return {
    createAutoMergeConfig: async (request: Request, response: Response) => {
      const payload = request.body as CreateAutoMergeConfigBody;
      const config = await service.createAutoMergeConfig(payload);

      response.status(201).json({
        success: true,
        data: config,
      });
    },

    createDailySnapshot: async (request: Request, response: Response) => {
      const payload = request.body as CreateDailySnapshotBody;
      const snapshot = await service.createDailySnapshot(payload);

      response.status(201).json({
        success: true,
        data: snapshot,
      });
    },

    executeConfig: async (request: Request, response: Response) => {
      const configId = request.params.id;

      if (!configId || Array.isArray(configId)) {
        throw new ApiError(400, "INVALID_CONFIG_ID", "Auto merge configuration id is required.");
      }

      response.status(200).json({
        success: true,
        data: await service.executeConfig(configId, request.auth!),
      });
    },

    getExecutionPlan: async (request: Request, response: Response) => {
      const configId = request.params.id;

      if (!configId || Array.isArray(configId)) {
        throw new ApiError(400, "INVALID_CONFIG_ID", "Auto merge configuration id is required.");
      }

      response.status(200).json({
        success: true,
        data: await service.getExecutionPlan(configId),
      });
    },

    getPointSystemSettings: async (_request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: await service.getPointSystemSettings(),
      });
    },

    listAutoMergeConfigs: async (_request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: {
          configs: await service.listAutoMergeConfigs(),
        },
      });
    },

    listAutomationRuns: async (_request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: {
          runs: await service.listAutomationRuns(),
        },
      });
    },

    listDailySnapshots: async (_request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: {
          snapshots: await service.listDailySnapshots(),
        },
      });
    },

    updatePointSystemSettings: async (request: Request, response: Response) => {
      const payload = request.body as UpdatePointSystemBody;

      response.status(200).json({
        success: true,
        data: await service.updatePointSystemSettings(request.auth!, payload),
      });
    },
  };
}
