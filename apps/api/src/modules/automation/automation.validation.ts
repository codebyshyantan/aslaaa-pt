import { z } from "zod";

export const createAutoMergeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  favoriteMergeId: z.string().uuid(),
  resetTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  scrimId: z.string().uuid(),
});

export const createDailySnapshotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayName: z.string().trim().min(3).max(20),
  mergeId: z.string().uuid(),
  scrimId: z.string().uuid(),
  standingsJson: z.record(z.string(), z.unknown()),
});

export const updatePointSystemSchema = z.object({
  expectedUpdatedAt: z.string().datetime().nullable().optional().default(null),
  killPointValue: z.coerce.number().int().min(0).max(10),
  positionPoints: z.array(z.coerce.number().int().min(0).max(50)).min(1).max(64),
});

export type CreateAutoMergeConfigBody = z.infer<typeof createAutoMergeConfigSchema>;
export type CreateDailySnapshotBody = z.infer<typeof createDailySnapshotSchema>;
export type UpdatePointSystemBody = z.infer<typeof updatePointSystemSchema>;
