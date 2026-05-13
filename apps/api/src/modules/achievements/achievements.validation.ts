import { z } from "zod";

export const createAchievementSchema = z.object({
  description: z.string().trim().min(10).max(2_000),
  title: z.string().trim().min(3).max(120),
});

export type CreateAchievementBody = z.infer<typeof createAchievementSchema>;
