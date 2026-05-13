import { Router } from "express";

import { asyncHandler } from "../../lib/http/async-handler.js";
import { validateBody } from "../auth/auth.validation.js";
import type { createAuthMiddleware } from "../auth/auth.middleware.js";
import { createAchievementSchema } from "./achievements.validation.js";

type AchievementsController = ReturnType<
  typeof import("./achievements.controller.js").createAchievementsController
>;
type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;

type AchievementsRoutesDependencies = {
  controller: AchievementsController;
  middleware: AuthMiddleware;
};

export function createAchievementsRouter({
  controller,
  middleware,
}: AchievementsRoutesDependencies) {
  const router = Router();

  router.use(middleware.requireAuth());
  router.use(middleware.requireRouteAccess("/achievements"));
  router.get("/", asyncHandler(controller.listAchievements));
  router.post(
    "/",
    middleware.requireRole(["ADMIN"]),
    validateBody(createAchievementSchema),
    asyncHandler(controller.createAchievement),
  );

  return router;
}
