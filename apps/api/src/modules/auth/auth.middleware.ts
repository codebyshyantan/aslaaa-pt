import type { NextFunction, Request, Response } from "express";

import type { AppEnv } from "../../config/env.js";
import { getRouteContract, type ProtectedAppRoute } from "../../contracts/app-contract.js";
import { ApiError } from "../../lib/http/api-error.js";
import type { UserRole } from "./auth.types.js";
import type { AuthService } from "./auth.service.js";
import { clearSessionCookie } from "./auth.cookies.js";

type AuthMiddlewareDependencies = {
  authService: AuthService;
  env: Pick<AppEnv, "COOKIE_SECURE" | "NODE_ENV" | "SESSION_COOKIE_NAME">;
};

type RequireAuthOptions = {
  auditOnFailure?: boolean;
};

export function buildRequestMetadata(request: Request) {
  return {
    ip: request.ip ?? null,
    method: request.method,
    path: request.originalUrl,
    userAgent: request.get("user-agent") ?? null,
  };
}

export function getSessionTokenFromRequest(
  request: Request,
  env: Pick<AppEnv, "SESSION_COOKIE_NAME">,
) {
  const token = request.cookies?.[env.SESSION_COOKIE_NAME];
  return typeof token === "string" && token.length > 0 ? token : null;
}

export function createAuthMiddleware({ authService, env }: AuthMiddlewareDependencies) {
  function requireAuth({ auditOnFailure = true }: RequireAuthOptions = {}) {
    return async (request: Request, response: Response, next: NextFunction) => {
      const requestMetadata = buildRequestMetadata(request);
      const sessionToken = getSessionTokenFromRequest(request, env);
      const authContext = await authService.resolveSession(sessionToken);

      if (!authContext) {
        clearSessionCookie(response, env);

        if (auditOnFailure) {
          await authService.recordInvalidAccess(
            requestMetadata,
            sessionToken ? "INVALID_OR_EXPIRED_SESSION" : "MISSING_SESSION_COOKIE",
          );
        }

        next(new ApiError(401, "UNAUTHENTICATED", "Authentication required."));
        return;
      }

      request.auth = authContext;
      next();
    };
  }

  function requireRole(allowedRoles: UserRole[]) {
    return async (request: Request, _response: Response, next: NextFunction) => {
      if (!request.auth) {
        next(new ApiError(401, "UNAUTHENTICATED", "Authentication required."));
        return;
      }

      if (!allowedRoles.includes(request.auth.user.role)) {
        await authService.recordRoleViolation(request.auth, buildRequestMetadata(request), allowedRoles);
        next(new ApiError(403, "FORBIDDEN", "You do not have access to this resource."));
        return;
      }

      next();
    };
  }

  function requireRouteAccess(route: ProtectedAppRoute) {
    const contract = getRouteContract(route);

    if (!contract) {
      throw new Error(`Route contract not found for ${route}`);
    }

    return requireRole([...contract.roles]);
  }

  return {
    requireAuth,
    requireRole,
    requireRouteAccess,
  };
}
