import { Router } from "express";

import { asyncHandler } from "../../lib/http/async-handler.js";
import { validateBody } from "../auth/auth.validation.js";
import type { createAuthMiddleware } from "../auth/auth.middleware.js";
import {
  createAutoMergeConfigSchema,
  createDailySnapshotSchema,
  updatePointSystemSchema,
} from "./automation.validation.js";

type AutomationController = ReturnType<typeof import("./automation.controller.js").createAutomationController>;
type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;

type AutomationRoutesDependencies = {
  controller: AutomationController;
  middleware: AuthMiddleware;
};

export function createAutomationRouter({ controller, middleware }: AutomationRoutesDependencies) {
  const router = Router();

  router.use(middleware.requireAuth());

  router.get("/configs", middleware.requireRouteAccess("/settings"), asyncHandler(controller.listAutoMergeConfigs));
  router.post(
    "/configs",
    middleware.requireRouteAccess("/settings"),
    validateBody(createAutoMergeConfigSchema),
    asyncHandler(controller.createAutoMergeConfig),
  );
  router.get("/configs/:id/plan", middleware.requireRouteAccess("/settings"), asyncHandler(controller.getExecutionPlan));
  router.post("/configs/:id/run", middleware.requireRouteAccess("/settings"), asyncHandler(controller.executeConfig));
  router.get("/runs", middleware.requireRouteAccess("/settings"), asyncHandler(controller.listAutomationRuns));
  router.get("/point-system", middleware.requireRouteAccess("/settings"), asyncHandler(controller.getPointSystemSettings));
  router.put(
    "/point-system",
    middleware.requireRouteAccess("/settings"),
    validateBody(updatePointSystemSchema),
    asyncHandler(controller.updatePointSystemSettings),
  );
  router.get("/snapshots", middleware.requireRouteAccess("/tournaments"), asyncHandler(controller.listDailySnapshots));
  router.post(
    "/snapshots",
    middleware.requireRouteAccess("/settings"),
    validateBody(createDailySnapshotSchema),
    asyncHandler(controller.createDailySnapshot),
  );

  return router;
}
