import { Router } from "express";

import { asyncHandler } from "../../lib/http/async-handler.js";
import { validateBody } from "../auth/auth.validation.js";
import type { createAuthMiddleware } from "../auth/auth.middleware.js";
import {
  createSuggestionSchema,
  updateSuggestionStatusSchema,
} from "./suggestions.validation.js";

type SuggestionsController = ReturnType<typeof import("./suggestions.controller.js").createSuggestionsController>;
type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;

type SuggestionsRoutesDependencies = {
  controller: SuggestionsController;
  middleware: AuthMiddleware;
};

export function createSuggestionsRouter({ controller, middleware }: SuggestionsRoutesDependencies) {
  const router = Router();

  router.use(middleware.requireAuth());
  router.use(middleware.requireRouteAccess("/suggestions"));
  router.get("/", asyncHandler(controller.listSuggestions));
  router.post("/", validateBody(createSuggestionSchema), asyncHandler(controller.createSuggestion));
  router.patch(
    "/:id/status",
    middleware.requireRole(["ADMIN"]),
    validateBody(updateSuggestionStatusSchema),
    asyncHandler(controller.updateSuggestionStatus),
  );

  return router;
}
