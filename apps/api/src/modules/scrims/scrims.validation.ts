import { z } from "zod";

const sortOrderSchema = z.coerce.number().int().min(0).max(999).default(0);
const deleteConfirmationSchema = z.object({
  confirmCascade: z.literal(true),
});
const renameScrimSchema = z.object({
  name: z.string().trim().min(3).max(80),
});
const renameStructureEntitySchema = z.object({
  name: z.string().trim().min(2).max(60),
});
const renameMergePresetSchema = z.object({
  name: z.string().trim().min(3).max(80),
});

export const createScrimSchema = z.object({
  description: z.string().trim().max(500).optional().default(""),
  name: z.string().trim().min(3).max(80),
});

export const createTierSchema = z.object({
  name: z.string().trim().min(2).max(60),
  scrimId: z.string().uuid(),
  sortOrder: sortOrderSchema,
});

export const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(60),
  sortOrder: sortOrderSchema,
  tierId: z.string().uuid(),
});

export const createLobbySchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().trim().min(2).max(60),
  sortOrder: sortOrderSchema,
});

export const replaceLobbyEntriesSchema = z.object({
  entries: z
    .array(
      z.object({
        kills: z.coerce.number().int().min(0).max(99).default(0),
        position: z.coerce.number().int().min(1).max(64).nullable().default(null),
        slotNumber: z.coerce.number().int().min(1).max(64).nullable().default(null),
        teamName: z.string().max(80),
      }),
    )
    .max(64),
  expectedUpdatedAt: z.string().datetime().nullable().optional().default(null),
});

export const createMergePresetSchema = z.object({
  isFavorite: z.boolean().default(false),
  lobbyIds: z.array(z.string().uuid()).min(1).max(64),
  name: z.string().trim().min(3).max(80),
  scrimId: z.string().uuid(),
});

export const mergePreviewSchema = z.object({
  lobbyIds: z.array(z.string().uuid()).min(1).max(64),
});

export { deleteConfirmationSchema, renameMergePresetSchema, renameScrimSchema, renameStructureEntitySchema };
export type CreateScrimBody = z.infer<typeof createScrimSchema>;
export type CreateTierBody = z.infer<typeof createTierSchema>;
export type CreateGroupBody = z.infer<typeof createGroupSchema>;
export type CreateLobbyBody = z.infer<typeof createLobbySchema>;
export type ReplaceLobbyEntriesBody = z.infer<typeof replaceLobbyEntriesSchema>;
export type CreateMergePresetBody = z.infer<typeof createMergePresetSchema>;
export type MergePreviewBody = z.infer<typeof mergePreviewSchema>;
export type DeleteConfirmationBody = z.infer<typeof deleteConfirmationSchema>;
export type RenameMergePresetBody = z.infer<typeof renameMergePresetSchema>;
export type RenameScrimBody = z.infer<typeof renameScrimSchema>;
export type RenameStructureEntityBody = z.infer<typeof renameStructureEntitySchema>;
