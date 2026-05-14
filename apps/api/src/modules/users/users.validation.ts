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

export const resetUserPasswordSchema = z.object({
  password: z.string().min(6).max(128),
});

export type CreateUserBody = z.infer<typeof createUserSchema>;
export type ResetUserPasswordBody = z.infer<typeof resetUserPasswordSchema>;
export type UpdateUserStatusBody = z.infer<typeof updateUserStatusSchema>;
