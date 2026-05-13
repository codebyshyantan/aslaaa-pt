import { z } from "zod";

export const importTeamsSchema = z.object({
  rawInput: z.string().trim().min(1).max(20_000),
});

export type ImportTeamsBody = z.infer<typeof importTeamsSchema>;
