import { z } from "zod";

import { suggestionStatusValues } from "./suggestions.types.js";

export const createSuggestionSchema = z.object({
  description: z.string().trim().min(10).max(2_000),
  title: z.string().trim().min(3).max(120),
});

export const updateSuggestionStatusSchema = z.object({
  status: z.enum(suggestionStatusValues),
});

export type CreateSuggestionBody = z.infer<typeof createSuggestionSchema>;
export type UpdateSuggestionStatusBody = z.infer<typeof updateSuggestionStatusSchema>;
