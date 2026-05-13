import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";

import type { AppEnv } from "../../config/env.js";
import { asyncHandler } from "../../lib/http/async-handler.js";
import { ApiError } from "../../lib/http/api-error.js";
import { validateBody, loginRequestSchema } from "./auth.validation.js";

type AuthController = ReturnType<typeof import("./auth.controller.js").createAuthController>;
type AuthMiddleware = ReturnType<typeof import("./auth.middleware.js").createAuthMiddleware>;

type AuthRoutesDependencies = {
  controller: AuthController;
  env: Pick<AppEnv, "AUTH_RATE_LIMIT_MAX" | "AUTH_RATE_LIMIT_WINDOW_MS">;
  middleware: AuthMiddleware;
};

export function createAuthRouter({ controller, env, middleware }: AuthRoutesDependencies) {
  const router = Router();

  const loginRateLimiter = rateLimit({
    legacyHeaders: false,
    limit: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: "draft-8",
    windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS,
    keyGenerator: (request) => {
      const username =
        typeof request.body?.username === "string" ? request.body.username.toLowerCase().trim() : "anonymous";
      return `${ipKeyGenerator(request.ip ?? "unknown")}:${username}`;
    },
    handler: (_request, _response, next) => {
      next(new ApiError(429, "RATE_LIMITED", "Too many login attempts. Try again later."));
    },
  });

  router.get(
    "/directory",
    middleware.requireAuth(),
    middleware.requireRole(["ADMIN"]),
    asyncHandler(controller.getLoginDirectory),
  );
  router.post("/login", loginRateLimiter, validateBody(loginRequestSchema), asyncHandler(controller.login));
  router.post("/logout", asyncHandler(controller.logout));
  router.get("/session", middleware.requireAuth({ auditOnFailure: false }), asyncHandler(controller.getSession));
  router.get(
    "/access/settings",
    middleware.requireAuth(),
    middleware.requireRole(["ADMIN"]),
    asyncHandler(controller.getRouteAccessProbe("settings")),
  );
  router.get(
    "/access/users",
    middleware.requireAuth(),
    middleware.requireRole(["ADMIN"]),
    asyncHandler(controller.getRouteAccessProbe("users")),
  );

  return router;
}
