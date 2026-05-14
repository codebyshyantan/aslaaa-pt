import { Router } from "express";

import { asyncHandler } from "../../lib/http/async-handler.js";
import { validateBody } from "../auth/auth.validation.js";
import type { createAuthMiddleware } from "../auth/auth.middleware.js";
import { updateFeaturedLeaderboardSchema } from "./leaderboards.validation.js";

type LeaderboardsController = ReturnType<
  typeof import("./leaderboards.controller.js").createLeaderboardsController
>;
type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;

type LeaderboardsRoutesDependencies = {
  controller: LeaderboardsController;
  middleware: AuthMiddleware;
};

export function createLeaderboardsRouter({ controller, middleware }: LeaderboardsRoutesDependencies) {
  const router = Router();

  router.get("/featured", asyncHandler(controller.getFeaturedOverview));

  router.use(middleware.requireAuth());
  router.get("/weekly", middleware.requireRouteAccess("/tournaments"), asyncHandler(controller.getWeeklyLeaderboard));
  router.put(
    "/featured",
    middleware.requireRouteAccess("/settings"),
    validateBody(updateFeaturedLeaderboardSchema),
    asyncHandler(controller.updateFeaturedLeaderboard),
  );

  return router;
}
