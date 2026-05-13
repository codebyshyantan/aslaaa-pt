import { Router } from "express";

import { asyncHandler } from "../../lib/http/async-handler.js";
import type { createAuthMiddleware } from "../auth/auth.middleware.js";

type ActivityController = ReturnType<typeof import("./activity.controller.js").createActivityController>;
type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;

type ActivityRoutesDependencies = {
  controller: ActivityController;
  middleware: AuthMiddleware;
};

export function createActivityRouter({ controller, middleware }: ActivityRoutesDependencies) {
  const router = Router();

  router.use(middleware.requireAuth());
  router.use(middleware.requireRouteAccess("/dashboard"));
  router.get("/", asyncHandler(controller.listRecent));

  return router;
}
