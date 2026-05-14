import {
  buildLobbyStandings,
  defaultPointSystemSettings,
  mergeStandings,
  normalizeCompetitionTeamName,
  sanitizeCompetitionTeamName,
  type PointSystemSettings,
} from "../../contracts/competition-contract.js";
import { ApiError } from "../../lib/http/api-error.js";
import { isPostgresUniqueViolation } from "../../persistence/postgres-errors.js";
import type { CreateActivityLogInput } from "../activity/activity.types.js";
import type { AuthenticatedRequestContext } from "../auth/auth.types.js";
import { LobbyStateConflictError, type ScrimsRepository } from "./scrims.repository.js";
import type { MergePreviewResponse } from "./scrims.types.js";
import type {
  CreateGroupBody,
  CreateLobbyBody,
  CreateMergePresetBody,
  CreateScrimBody,
  CreateTierBody,
  DeleteConfirmationBody,
  MergePreviewBody,
  RenameMergePresetBody,
  RenameScrimBody,
  RenameStructureEntityBody,
  ReplaceLobbyEntriesBody,
} from "./scrims.validation.js";

type ScrimsServiceDependencies = {
  getPointSystemSettings?: () => Promise<PointSystemSettings>;
  now?: () => Date;
  recordActivity?: (input: CreateActivityLogInput) => Promise<unknown>;
  repository: ScrimsRepository;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export class ScrimsService {
  constructor(
    private readonly repository: ScrimsRepository,
    private readonly getPointSystemSettings: () => Promise<PointSystemSettings>,
    private readonly recordActivity?: (input: CreateActivityLogInput) => Promise<unknown>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  static create({
    getPointSystemSettings = async () => defaultPointSystemSettings,
    now,
    recordActivity,
    repository,
  }: ScrimsServiceDependencies) {
    return new ScrimsService(repository, getPointSystemSettings, recordActivity, now);
  }

  async createGroup(actor: AuthenticatedRequestContext, payload: CreateGroupBody) {
    const tier = await this.repository.findTierById(payload.tierId);

    if (!tier) {
      throw new ApiError(404, "TIER_NOT_FOUND", "Selected tier was not found.");
    }

    try {
      const group = await this.repository.createGroup({
        createdAt: this.now().toISOString(),
        name: payload.name.trim(),
        sortOrder: payload.sortOrder,
        tierId: payload.tierId,
        updatedAt: this.now().toISOString(),
      });

      await this.writeActivity(actor, "SCRIMS", "CREATE_GROUP", `Created group ${group.name}.`, "GROUP", group.id, {
        tierId: group.tierId,
      });

      return group;
    } catch (error) {
      if (isPostgresUniqueViolation(error, ["scrim_groups_tier_name_unique"])) {
        throw new ApiError(409, "GROUP_ALREADY_EXISTS", "A group with this name already exists for the selected tier.");
      }

      throw error;
    }
  }

  async createLobby(actor: AuthenticatedRequestContext, payload: CreateLobbyBody) {
    const group = await this.repository.findGroupById(payload.groupId);

    if (!group) {
      throw new ApiError(404, "GROUP_NOT_FOUND", "Selected group was not found.");
    }

    try {
      const lobby = await this.repository.createLobby({
        createdAt: this.now().toISOString(),
        groupId: payload.groupId,
        name: payload.name.trim(),
        sortOrder: payload.sortOrder,
        updatedAt: this.now().toISOString(),
      });

      await this.writeActivity(actor, "SCRIMS", "CREATE_LOBBY", `Created lobby ${lobby.name}.`, "LOBBY", lobby.id, {
        groupId: lobby.groupId,
      });

      return lobby;
    } catch (error) {
      if (isPostgresUniqueViolation(error, ["lobbies_group_name_unique"])) {
        throw new ApiError(409, "LOBBY_ALREADY_EXISTS", "A lobby with this name already exists for the selected group.");
      }

      throw error;
    }
  }

  async createMergePreset(actor: AuthenticatedRequestContext, payload: CreateMergePresetBody) {
    const scrim = await this.repository.findScrimById(payload.scrimId);

    if (!scrim) {
      throw new ApiError(404, "SCRIM_NOT_FOUND", "Selected scrim was not found.");
    }

    const state = await this.repository.listState();
    const scrimTierIds = new Set(state.tiers.filter((tier) => tier.scrimId === payload.scrimId).map((tier) => tier.id));
    const scrimGroupIds = new Set(state.groups.filter((group) => scrimTierIds.has(group.tierId)).map((group) => group.id));
    const scrimLobbyIds = new Set(state.lobbies.filter((lobby) => scrimGroupIds.has(lobby.groupId)).map((lobby) => lobby.id));

    for (const lobbyId of payload.lobbyIds) {
      if (!scrimLobbyIds.has(lobbyId)) {
        throw new ApiError(
          400,
          "INVALID_MERGE_PRESET_LOBBY",
          "Every selected lobby must belong to the selected scrim.",
        );
      }
    }

    try {
      const preset = await this.repository.createMergePreset({
        createdAt: this.now().toISOString(),
        isFavorite: payload.isFavorite,
        lobbyIds: [...new Set(payload.lobbyIds)],
        name: payload.name.trim(),
        scrimId: payload.scrimId,
        updatedAt: this.now().toISOString(),
      });

      await this.writeActivity(
        actor,
        "MERGES",
        "CREATE_MERGE_PRESET",
        `Created merge preset ${preset.name}.`,
        "MERGE_PRESET",
        preset.id,
        {
          isFavorite: preset.isFavorite,
          lobbyIds: preset.lobbyIds,
          scrimId: preset.scrimId,
        },
      );

      return preset;
    } catch (error) {
      if (isPostgresUniqueViolation(error, ["merge_presets_scrim_name_unique"])) {
        throw new ApiError(
          409,
          "MERGE_PRESET_ALREADY_EXISTS",
          "A merge preset with this name already exists for the selected scrim.",
        );
      }

      throw error;
    }
  }

  async createScrim(actor: AuthenticatedRequestContext, payload: CreateScrimBody) {
    const nowIso = this.now().toISOString();
    const slug = slugify(payload.name);

    if (!slug) {
      throw new ApiError(400, "INVALID_SCRIM_NAME", "Scrim name could not be converted into a stable slug.");
    }

    try {
      const scrim = await this.repository.createScrim({
        createdAt: nowIso,
        description: payload.description.trim().length > 0 ? payload.description.trim() : null,
        isActive: true,
        name: payload.name.trim(),
        slug,
        updatedAt: nowIso,
      });

      await this.writeActivity(actor, "SCRIMS", "CREATE_SCRIM", `Created scrim ${scrim.name}.`, "SCRIM", scrim.id, {
        slug: scrim.slug,
      });

      return scrim;
    } catch (error) {
      if (isPostgresUniqueViolation(error, ["scrims_slug_key"])) {
        throw new ApiError(409, "SCRIM_ALREADY_EXISTS", "A scrim with this name already exists.");
      }

      throw error;
    }
  }

  async createTier(actor: AuthenticatedRequestContext, payload: CreateTierBody) {
    const scrim = await this.repository.findScrimById(payload.scrimId);

    if (!scrim) {
      throw new ApiError(404, "SCRIM_NOT_FOUND", "Selected scrim was not found.");
    }

    try {
      const tier = await this.repository.createTier({
        createdAt: this.now().toISOString(),
        name: payload.name.trim(),
        scrimId: payload.scrimId,
        sortOrder: payload.sortOrder,
        updatedAt: this.now().toISOString(),
      });

      await this.writeActivity(actor, "SCRIMS", "CREATE_TIER", `Created tier ${tier.name}.`, "TIER", tier.id, {
        scrimId: tier.scrimId,
      });

      return tier;
    } catch (error) {
      if (isPostgresUniqueViolation(error, ["scrim_tiers_scrim_name_unique"])) {
        throw new ApiError(409, "TIER_ALREADY_EXISTS", "A tier with this name already exists for the selected scrim.");
      }

      throw error;
    }
  }

  async deleteGroup(actor: AuthenticatedRequestContext, id: string, _payload: DeleteConfirmationBody) {
    const deletedGroup = await this.repository.deleteGroup(id);

    if (!deletedGroup) {
      throw new ApiError(404, "GROUP_NOT_FOUND", "Group not found.");
    }

    await this.writeActivity(actor, "SCRIMS", "DELETE_GROUP", `Deleted group ${deletedGroup.name}.`, "GROUP", id, {});
    return deletedGroup;
  }

  async deleteLobby(actor: AuthenticatedRequestContext, id: string, _payload: DeleteConfirmationBody) {
    const deletedLobby = await this.repository.deleteLobby(id);

    if (!deletedLobby) {
      throw new ApiError(404, "LOBBY_NOT_FOUND", "Lobby not found.");
    }

    await this.writeActivity(actor, "SCRIMS", "DELETE_LOBBY", `Deleted lobby ${deletedLobby.name}.`, "LOBBY", id, {});
    return deletedLobby;
  }

  async deleteMergePreset(actor: AuthenticatedRequestContext, id: string, _payload: DeleteConfirmationBody) {
    const deletedPreset = await this.repository.deleteMergePreset(id);

    if (!deletedPreset) {
      throw new ApiError(404, "MERGE_PRESET_NOT_FOUND", "Merge preset not found.");
    }

    await this.writeActivity(
      actor,
      "MERGES",
      "DELETE_MERGE_PRESET",
      `Deleted merge preset ${deletedPreset.name}.`,
      "MERGE_PRESET",
      id,
      {},
    );
    return deletedPreset;
  }

  async deleteScrim(actor: AuthenticatedRequestContext, id: string, _payload: DeleteConfirmationBody) {
    const deletedScrim = await this.repository.deleteScrim(id);

    if (!deletedScrim) {
      throw new ApiError(404, "SCRIM_NOT_FOUND", "Scrim not found.");
    }

    await this.writeActivity(actor, "SCRIMS", "DELETE_SCRIM", `Deleted scrim ${deletedScrim.name}.`, "SCRIM", id, {});
    return deletedScrim;
  }

  async deleteTier(actor: AuthenticatedRequestContext, id: string, _payload: DeleteConfirmationBody) {
    const deletedTier = await this.repository.deleteTier(id);

    if (!deletedTier) {
      throw new ApiError(404, "TIER_NOT_FOUND", "Tier not found.");
    }

    await this.writeActivity(actor, "SCRIMS", "DELETE_TIER", `Deleted tier ${deletedTier.name}.`, "TIER", id, {});
    return deletedTier;
  }

  async getMergePresetStandings(presetId: string) {
    const pointSystem = await this.getPointSystemSettings();
    const sourceResult = await this.repository.getMergeSourceCollectionsByPresetId(presetId);

    if (!sourceResult.preset) {
      throw new ApiError(404, "MERGE_PRESET_NOT_FOUND", "Merge preset not found.");
    }

    return this.buildMergePreviewResponse(pointSystem, sourceResult.collections, sourceResult.preset);
  }

  async listState() {
    return this.repository.listState();
  }

  async previewMerge(payload: MergePreviewBody) {
    const pointSystem = await this.getPointSystemSettings();
    const sourceResult = await this.repository.getMergeSourceCollectionsByLobbyIds(payload.lobbyIds);
    return this.buildMergePreviewResponse(pointSystem, sourceResult.collections, null);
  }

  async replaceLobbyEntries(actor: AuthenticatedRequestContext, lobbyId: string, payload: ReplaceLobbyEntriesBody) {
    const lobby = await this.repository.findLobbyById(lobbyId);

    if (!lobby) {
      throw new ApiError(404, "LOBBY_NOT_FOUND", "Selected lobby was not found.");
    }

    const pointSystem = await this.getPointSystemSettings();
    const normalizedNames = new Set<string>();
    const usedPositions = new Set<number>();
    const filteredEntries = payload.entries.filter((entry) => {
      const teamName = sanitizeCompetitionTeamName(entry.teamName);
      return teamName.length > 0 || entry.kills > 0 || entry.position !== null;
    });

    for (const entry of filteredEntries) {
      const teamName = sanitizeCompetitionTeamName(entry.teamName);

      if (teamName.length === 0) {
        throw new ApiError(
          400,
          "LOBBY_ENTRY_TEAM_REQUIRED",
          "Team name is required whenever position or kills are provided.",
        );
      }

      const normalizedName = normalizeCompetitionTeamName(teamName);
      if (normalizedNames.has(normalizedName)) {
        throw new ApiError(409, "LOBBY_DUPLICATE_TEAM", "Duplicate team names are not allowed inside the same lobby.");
      }

      normalizedNames.add(normalizedName);

      if (entry.position !== null) {
        if (usedPositions.has(entry.position)) {
          throw new ApiError(409, "LOBBY_DUPLICATE_POSITION", "Duplicate finishing positions are not allowed inside the same lobby.");
        }

        usedPositions.add(entry.position);
      }
    }

    const nowIso = this.now().toISOString();
    const rankedEntries = buildLobbyStandings(
      filteredEntries.map((entry) => ({
        kills: entry.kills,
        position: entry.position,
        slotNumber: entry.slotNumber,
        teamName: entry.teamName,
      })),
      pointSystem,
    );

    let savedState;

    try {
      savedState = await this.repository.replaceLobbyEntries({
        entries: rankedEntries.map((entry) => ({
          createdAt: nowIso,
          kills: entry.kills,
          normalizedTeamName: entry.normalizedTeamName,
          placementPoints: entry.placementPoints,
          position: entry.position,
          rank: entry.rank,
          slotNumber: entry.slotNumber,
          teamName: entry.teamName,
          totalPoints: entry.totalPoints,
          updatedAt: nowIso,
        })),
        expectedUpdatedAt: payload.expectedUpdatedAt,
        lastUpdatedByUserId: actor.user.id,
        lastUpdatedByUsername: actor.user.username,
        lobbyId,
        nextUpdatedAt: nowIso,
      });
    } catch (error) {
      if (error instanceof LobbyStateConflictError) {
        throw new ApiError(
          409,
          "LOBBY_STALE_STATE",
          "This lobby was updated by another user. Refresh the lobby before saving again.",
          {
            currentUpdatedAt: error.currentLobby.updatedAt,
            expectedUpdatedAt: error.expectedUpdatedAt,
            lastUpdatedByUsername: error.currentLobby.lastUpdatedByUsername,
            lobbyId: error.currentLobby.id,
          },
        );
      }

      throw error;
    }

    await this.writeActivity(
      actor,
      "SCRIMS",
      "SAVE_LOBBY_ENTRIES",
      `Saved ${savedState.entries.length} lobby entries.`,
      "LOBBY",
      lobbyId,
      {
        savedEntries: savedState.entries.length,
      },
    );

    return savedState;
  }

  async renameGroup(actor: AuthenticatedRequestContext, id: string, payload: RenameStructureEntityBody) {
    const group = await this.repository.findGroupById(id);

    if (!group) {
      throw new ApiError(404, "GROUP_NOT_FOUND", "Group not found.");
    }

    const state = await this.repository.listState();
    if (
      state.groups.some(
        (entry) =>
          entry.id !== id &&
          entry.tierId === group.tierId &&
          entry.name.localeCompare(payload.name.trim(), undefined, { sensitivity: "accent" }) === 0,
      )
    ) {
      throw new ApiError(409, "GROUP_ALREADY_EXISTS", "A group with this name already exists for the selected tier.");
    }

    const nextGroup = await this.repository.updateGroupName(id, payload.name.trim(), this.now().toISOString());
    if (!nextGroup) {
      throw new ApiError(404, "GROUP_NOT_FOUND", "Group not found.");
    }

    await this.writeActivity(actor, "SCRIMS", "RENAME_GROUP", `Renamed group to ${nextGroup.name}.`, "GROUP", id, {});
    return nextGroup;
  }

  async renameLobby(actor: AuthenticatedRequestContext, id: string, payload: RenameStructureEntityBody) {
    const lobby = await this.repository.findLobbyById(id);

    if (!lobby) {
      throw new ApiError(404, "LOBBY_NOT_FOUND", "Lobby not found.");
    }

    const state = await this.repository.listState();
    if (
      state.lobbies.some(
        (entry) =>
          entry.id !== id &&
          entry.groupId === lobby.groupId &&
          entry.name.localeCompare(payload.name.trim(), undefined, { sensitivity: "accent" }) === 0,
      )
    ) {
      throw new ApiError(409, "LOBBY_ALREADY_EXISTS", "A lobby with this name already exists for the selected group.");
    }

    const nextLobby = await this.repository.updateLobbyName(id, payload.name.trim(), this.now().toISOString());
    if (!nextLobby) {
      throw new ApiError(404, "LOBBY_NOT_FOUND", "Lobby not found.");
    }

    await this.writeActivity(actor, "SCRIMS", "RENAME_LOBBY", `Renamed lobby to ${nextLobby.name}.`, "LOBBY", id, {});
    return nextLobby;
  }

  async renameMergePreset(actor: AuthenticatedRequestContext, id: string, payload: RenameMergePresetBody) {
    const preset = await this.repository.findMergePresetById(id);

    if (!preset) {
      throw new ApiError(404, "MERGE_PRESET_NOT_FOUND", "Merge preset not found.");
    }

    const state = await this.repository.listState();
    if (
      state.mergePresets.some(
        (entry) =>
          entry.id !== id &&
          entry.scrimId === preset.scrimId &&
          entry.name.localeCompare(payload.name.trim(), undefined, { sensitivity: "accent" }) === 0,
      )
    ) {
      throw new ApiError(
        409,
        "MERGE_PRESET_ALREADY_EXISTS",
        "A merge preset with this name already exists for the selected scrim.",
      );
    }

    const nextPreset = await this.repository.updateMergePresetName(id, payload.name.trim(), this.now().toISOString());
    if (!nextPreset) {
      throw new ApiError(404, "MERGE_PRESET_NOT_FOUND", "Merge preset not found.");
    }

    await this.writeActivity(
      actor,
      "MERGES",
      "RENAME_MERGE_PRESET",
      `Renamed merge preset to ${nextPreset.name}.`,
      "MERGE_PRESET",
      id,
      {},
    );
    return nextPreset;
  }

  async renameScrim(actor: AuthenticatedRequestContext, id: string, payload: RenameScrimBody) {
    const scrim = await this.repository.findScrimById(id);

    if (!scrim) {
      throw new ApiError(404, "SCRIM_NOT_FOUND", "Scrim not found.");
    }

    const slug = slugify(payload.name);
    if (!slug) {
      throw new ApiError(400, "INVALID_SCRIM_NAME", "Scrim name could not be converted into a stable slug.");
    }

    const state = await this.repository.listState();
    if (state.scrims.some((entry) => entry.id !== id && entry.slug === slug)) {
      throw new ApiError(409, "SCRIM_ALREADY_EXISTS", "A scrim with this name already exists.");
    }

    const nextScrim = await this.repository.updateScrim(id, payload.name.trim(), slug, this.now().toISOString());
    if (!nextScrim) {
      throw new ApiError(404, "SCRIM_NOT_FOUND", "Scrim not found.");
    }

    await this.writeActivity(actor, "SCRIMS", "RENAME_SCRIM", `Renamed scrim to ${nextScrim.name}.`, "SCRIM", id, {});
    return nextScrim;
  }

  async renameTier(actor: AuthenticatedRequestContext, id: string, payload: RenameStructureEntityBody) {
    const tier = await this.repository.findTierById(id);

    if (!tier) {
      throw new ApiError(404, "TIER_NOT_FOUND", "Tier not found.");
    }

    const state = await this.repository.listState();
    if (
      state.tiers.some(
        (entry) =>
          entry.id !== id &&
          entry.scrimId === tier.scrimId &&
          entry.name.localeCompare(payload.name.trim(), undefined, { sensitivity: "accent" }) === 0,
      )
    ) {
      throw new ApiError(409, "TIER_ALREADY_EXISTS", "A tier with this name already exists for the selected scrim.");
    }

    const nextTier = await this.repository.updateTierName(id, payload.name.trim(), this.now().toISOString());
    if (!nextTier) {
      throw new ApiError(404, "TIER_NOT_FOUND", "Tier not found.");
    }

    await this.writeActivity(actor, "SCRIMS", "RENAME_TIER", `Renamed tier to ${nextTier.name}.`, "TIER", id, {});
    return nextTier;
  }

  private buildMergePreviewResponse(
    pointSystem: PointSystemSettings,
    collections: Awaited<ReturnType<ScrimsRepository["getMergeSourceCollectionsByLobbyIds"]>>["collections"],
    preset: MergePreviewResponse["preset"],
  ): MergePreviewResponse {
    return {
      lobbies: collections.map((collection) => ({
        entryCount: collection.entries.length,
        id: collection.lobbyId,
        name: collection.lobbyName,
      })),
      pointSystem,
      preset,
      standings: mergeStandings(collections, pointSystem),
    };
  }

  private async writeActivity(
    actor: AuthenticatedRequestContext,
    module: string,
    action: string,
    description: string,
    targetType: string,
    targetId: string | null,
    payloadJson: Record<string, unknown>,
  ) {
    if (!this.recordActivity) {
      return;
    }

    await this.recordActivity({
      action,
      actorRole: actor.user.role,
      actorUserId: actor.user.id,
      actorUsername: actor.user.username,
      createdAt: this.now().toISOString(),
      description,
      module,
      payloadJson,
      targetId,
      targetType,
    });
  }
}
