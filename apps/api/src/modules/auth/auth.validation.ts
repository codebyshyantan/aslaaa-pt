import type { RequestHandler } from "express";
import { z } from "zod";

import { ApiError } from "../../lib/http/api-error.js";
import { roleValues } from "./auth.types.js";

const usernamePattern = /^[a-zA-Z0-9._-]+$/;

export const loginRequestSchema = z.object({
  password: z.string().min(6).max(128),
  role: z.enum(roleValues),
  username: z.string().trim().min(1).max(64).regex(usernamePattern, "Username contains invalid characters."),
});

export type LoginRequestBody = z.infer<typeof loginRequestSchema>;

export function validateBody<T extends z.ZodTypeAny>(schema: T): RequestHandler {
  return (request, _response, next) => {
    const parsed = schema.safeParse(request.body);

    if (!parsed.success) {
      next(
        new ApiError(400, "VALIDATION_ERROR", "Request payload validation failed.", {
          fieldErrors: parsed.error.flatten().fieldErrors,
          formErrors: parsed.error.flatten().formErrors,
        }),
      );
      return;
    }

    request.body = parsed.data;
    next();
  };
}
