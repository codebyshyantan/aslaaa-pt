import { Router } from "express";

import { asyncHandler } from "../../lib/http/async-handler.js";
import { validateBody } from "../auth/auth.validation.js";
import type { createAuthMiddleware } from "../auth/auth.middleware.js";
import { importTeamsSchema } from "./teams.validation.js";

type TeamsController = ReturnType<typeof import("./teams.controller.js").createTeamsController>;
type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;

type TeamsRoutesDependencies = {
  controller: TeamsController;
  middleware: AuthMiddleware;
};

export function createTeamsRouter({ controller, middleware }: TeamsRoutesDependencies) {
  const router = Router();

  router.use(middleware.requireAuth());
  router.use(middleware.requireRouteAccess("/unique-teams"));

  router.get("/", asyncHandler(controller.listTeams));
  router.post("/import", validateBody(importTeamsSchema), asyncHandler(controller.importTeams));

  return router;
}
