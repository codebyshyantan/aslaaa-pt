import type { Request, Response } from "express";

import type { AppEnv } from "../../config/env.js";
import { toAuthSessionResponse } from "./auth.types.js";
import type { AuthService } from "./auth.service.js";
import { clearSessionCookie, writeSessionCookie } from "./auth.cookies.js";
import { buildRequestMetadata, getSessionTokenFromRequest } from "./auth.middleware.js";
import type { LoginRequestBody } from "./auth.validation.js";

type AuthControllerDependencies = {
  authService: AuthService;
  env: Pick<AppEnv, "COOKIE_SECURE" | "SESSION_COOKIE_NAME">;
};

function setNoStore(response: Response) {
  response.setHeader("Cache-Control", "no-store");
}

export function createAuthController({ authService, env }: AuthControllerDependencies) {
  return {
    getLoginDirectory: async (_request: Request, response: Response) => {
      setNoStore(response);

      response.status(200).json({
        success: true,
        data: {
          roles: ["ADMIN", "PT_MAKER"],
          usersByRole: await authService.getLoginDirectory(),
        },
      });
    },

    getSession: async (request: Request, response: Response) => {
      setNoStore(response);

      response.status(200).json({
        success: true,
        data: toAuthSessionResponse(request.auth!),
      });
    },

    getRouteAccessProbe:
      (route: "settings" | "users") => async (request: Request, response: Response) => {
        setNoStore(response);

        response.status(200).json({
          success: true,
          data: {
            authorized: true,
            route,
            user: request.auth?.user ?? null,
          },
        });
      },

    login: async (request: Request, response: Response) => {
      const { context, sessionToken } = await authService.login(
        request.body as LoginRequestBody,
        buildRequestMetadata(request),
      );

      writeSessionCookie(response, env, sessionToken, context.expiresAt);
      setNoStore(response);

      response.status(200).json({
        success: true,
        data: toAuthSessionResponse(context),
      });
    },

    logout: async (request: Request, response: Response) => {
      const sessionToken = getSessionTokenFromRequest(request, env);

      if (sessionToken) {
        await authService.logout(sessionToken, buildRequestMetadata(request));
      }

      clearSessionCookie(response, env);
      setNoStore(response);

      response.status(200).json({
        success: true,
        data: {
          loggedOut: true,
        },
      });
    },
  };
}
