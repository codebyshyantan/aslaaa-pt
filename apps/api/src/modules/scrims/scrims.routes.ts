import { Router } from "express";

import { asyncHandler } from "../../lib/http/async-handler.js";
import { validateBody } from "../auth/auth.validation.js";
import type { createAuthMiddleware } from "../auth/auth.middleware.js";
import {
  createGroupSchema,
  createLobbySchema,
  createMergePresetSchema,
  createScrimSchema,
  createTierSchema,
  mergePreviewSchema,
  replaceLobbyEntriesSchema,
} from "./scrims.validation.js";

type ScrimsController = ReturnType<typeof import("./scrims.controller.js").createScrimsController>;
type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;

type ScrimsRoutesDependencies = {
  controller: ScrimsController;
  middleware: AuthMiddleware;
};

export function createScrimsRouter({ controller, middleware }: ScrimsRoutesDependencies) {
  const router = Router();

  router.use(middleware.requireAuth());
  router.use(middleware.requireRouteAccess("/scrims"));

  router.get("/", asyncHandler(controller.listState));
  router.post("/", middleware.requireRole(["ADMIN"]), validateBody(createScrimSchema), asyncHandler(controller.createScrim));
  router.post("/tiers", middleware.requireRole(["ADMIN"]), validateBody(createTierSchema), asyncHandler(controller.createTier));
  router.post("/groups", middleware.requireRole(["ADMIN"]), validateBody(createGroupSchema), asyncHandler(controller.createGroup));
  router.post("/lobbies", middleware.requireRole(["ADMIN"]), validateBody(createLobbySchema), asyncHandler(controller.createLobby));
  router.put(
    "/lobbies/:id/entries",
    validateBody(replaceLobbyEntriesSchema),
    asyncHandler(controller.replaceLobbyEntries),
  );
  router.post(
    "/merge-presets",
    middleware.requireRole(["ADMIN"]),
    validateBody(createMergePresetSchema),
    asyncHandler(controller.createMergePreset),
  );
  router.get("/merge-presets/:id/standings", asyncHandler(controller.getMergePresetStandings));
  router.post("/merge-preview", validateBody(mergePreviewSchema), asyncHandler(controller.previewMerge));

  return router;
}
