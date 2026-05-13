import { z } from "zod";

import { roleValues } from "../auth/auth.types.js";

export const createUserSchema = z.object({
  password: z.string().min(6).max(128),
  role: z.enum(roleValues),
  username: z.string().trim().min(3).max(64),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export type CreateUserBody = z.infer<typeof createUserSchema>;
export type UpdateUserStatusBody = z.infer<typeof updateUserStatusSchema>;
