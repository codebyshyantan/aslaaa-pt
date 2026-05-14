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
  deleteConfirmationSchema,
  mergePreviewSchema,
  renameMergePresetSchema,
  renameScrimSchema,
  renameStructureEntitySchema,
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
  router.patch(
    "/:id",
    middleware.requireRole(["ADMIN"]),
    validateBody(renameScrimSchema),
    asyncHandler(controller.renameScrim),
  );
  router.delete(
    "/:id",
    middleware.requireRole(["ADMIN"]),
    validateBody(deleteConfirmationSchema),
    asyncHandler(controller.deleteScrim),
  );
  router.post("/tiers", middleware.requireRole(["ADMIN"]), validateBody(createTierSchema), asyncHandler(controller.createTier));
  router.patch(
    "/tiers/:id",
    middleware.requireRole(["ADMIN"]),
    validateBody(renameStructureEntitySchema),
    asyncHandler(controller.renameTier),
  );
  router.delete(
    "/tiers/:id",
    middleware.requireRole(["ADMIN"]),
    validateBody(deleteConfirmationSchema),
    asyncHandler(controller.deleteTier),
  );
  router.post("/groups", middleware.requireRole(["ADMIN"]), validateBody(createGroupSchema), asyncHandler(controller.createGroup));
  router.patch(
    "/groups/:id",
    middleware.requireRole(["ADMIN"]),
    validateBody(renameStructureEntitySchema),
    asyncHandler(controller.renameGroup),
  );
  router.delete(
    "/groups/:id",
    middleware.requireRole(["ADMIN"]),
    validateBody(deleteConfirmationSchema),
    asyncHandler(controller.deleteGroup),
  );
  router.post("/lobbies", middleware.requireRole(["ADMIN"]), validateBody(createLobbySchema), asyncHandler(controller.createLobby));
  router.patch(
    "/lobbies/:id",
    middleware.requireRole(["ADMIN"]),
    validateBody(renameStructureEntitySchema),
    asyncHandler(controller.renameLobby),
  );
  router.delete(
    "/lobbies/:id",
    middleware.requireRole(["ADMIN"]),
    validateBody(deleteConfirmationSchema),
    asyncHandler(controller.deleteLobby),
  );
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
  router.patch(
    "/merge-presets/:id",
    middleware.requireRole(["ADMIN"]),
    validateBody(renameMergePresetSchema),
    asyncHandler(controller.renameMergePreset),
  );
  router.delete(
    "/merge-presets/:id",
    middleware.requireRole(["ADMIN"]),
    validateBody(deleteConfirmationSchema),
    asyncHandler(controller.deleteMergePreset),
  );
  router.get("/merge-presets/:id/standings", asyncHandler(controller.getMergePresetStandings));
  router.post("/merge-preview", validateBody(mergePreviewSchema), asyncHandler(controller.previewMerge));

  return router;
}
