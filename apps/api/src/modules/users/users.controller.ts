import type { Request, Response } from "express";

import { ApiError } from "../../lib/http/api-error.js";
import type { UsersService } from "./users.service.js";
import type { CreateUserBody, ResetUserPasswordBody, UpdateUserStatusBody } from "./users.validation.js";

type UsersControllerDependencies = {
  service: UsersService;
};

export function createUsersController({ service }: UsersControllerDependencies) {
  return {
    createUser: async (request: Request, response: Response) => {
      const payload = request.body as CreateUserBody;
      const user = await service.createUser(payload);

      response.status(201).json({
        success: true,
        data: user,
      });
    },

    deleteUser: async (request: Request, response: Response) => {
      const userId = request.params.id;

      if (!userId || Array.isArray(userId)) {
        throw new ApiError(400, "INVALID_USER_ID", "User id is required.");
      }

      response.status(200).json({
        success: true,
        data: await service.deleteUser(userId),
      });
    },

    listUsers: async (_request: Request, response: Response) => {
      response.status(200).json({
        success: true,
        data: {
          users: await service.listUsers(),
        },
      });
    },

    resetPassword: async (request: Request, response: Response) => {
      const userId = request.params.id;

      if (!userId || Array.isArray(userId)) {
        throw new ApiError(400, "INVALID_USER_ID", "User id is required.");
      }

      response.status(200).json({
        success: true,
        data: await service.resetPassword(userId, request.body as ResetUserPasswordBody),
      });
    },

    updateUserStatus: async (request: Request, response: Response) => {
      const userId = request.params.id;

      if (!userId || Array.isArray(userId)) {
        throw new ApiError(400, "INVALID_USER_ID", "User id is required.");
      }

      const payload = request.body as UpdateUserStatusBody;
      const user = await service.updateUserStatus(userId, payload.isActive);

      response.status(200).json({
        success: true,
        data: user,
      });
    },
  };
}
