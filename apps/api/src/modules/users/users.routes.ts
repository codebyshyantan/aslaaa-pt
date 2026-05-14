import { Router } from "express";

import { asyncHandler } from "../../lib/http/async-handler.js";
import { validateBody } from "../auth/auth.validation.js";
import type { createAuthMiddleware } from "../auth/auth.middleware.js";
import { createUserSchema, resetUserPasswordSchema, updateUserStatusSchema } from "./users.validation.js";

type UsersController = ReturnType<typeof import("./users.controller.js").createUsersController>;
type AuthMiddleware = ReturnType<typeof createAuthMiddleware>;

type UsersRoutesDependencies = {
  controller: UsersController;
  middleware: AuthMiddleware;
};

export function createUsersRouter({ controller, middleware }: UsersRoutesDependencies) {
  const router = Router();

  router.use(middleware.requireAuth());
  router.use(middleware.requireRouteAccess("/users"));

  router.get("/", asyncHandler(controller.listUsers));
  router.post("/", validateBody(createUserSchema), asyncHandler(controller.createUser));
  router.delete("/:id", asyncHandler(controller.deleteUser));
  router.patch("/:id/password", validateBody(resetUserPasswordSchema), asyncHandler(controller.resetPassword));
  router.patch("/:id/status", validateBody(updateUserStatusSchema), asyncHandler(controller.updateUserStatus));

  return router;
}
