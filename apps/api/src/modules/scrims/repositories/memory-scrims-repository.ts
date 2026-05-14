import { randomUUID } from "node:crypto";

import { ApiError } from "../../../lib/http/api-error.js";
import type { MergeSourceCollection } from "../../../contracts/competition-contract.js";
import { LobbyStateConflictError, type ScrimsRepository } from "../scrims.repository.js";
import type {
  CreateGroupInput,
  CreateLobbyInput,
  CreateMergePresetInput,
  CreateScrimInput,
  CreateTierInput,
  GroupRecord,
  LobbyEntryRecord,
  LobbyRecord,
  MergePresetRecord,
  MergeSourceCollectionsResult,
  ReplaceLobbyEntriesInput,
  ScrimRecord,
  ScrimsState,
  TierRecord,
} from "../scrims.types.js";

function clone<T>(value: T) {
  return structuredClone(value);
}

export class MemoryScrimsRepository implements ScrimsRepository {
  private readonly groups = new Map<string, GroupRecord>();
  private readonly lobbies = new Map<string, LobbyRecord>();
  private readonly lobbyEntries = new Map<string, LobbyEntryRecord>();
  private readonly mergePresetLobbyIds = new Map<string, string[]>();
  private readonly mergePresets = new Map<string, MergePresetRecord>();
  private readonly scrims = new Map<string, ScrimRecord>();
  private readonly tiers = new Map<string, TierRecord>();

  async clearLobbyEntriesForScrim(scrimId: string) {
    const lobbyIds = this.getLobbyIdsForScrim(scrimId);

    for (const [entryId, entry] of this.lobbyEntries.entries()) {
      if (lobbyIds.has(entry.lobbyId)) {
        this.lobbyEntries.delete(entryId);
      }
    }
  }

  async countEntriesForScrim(scrimId: string) {
    const lobbyIds = this.getLobbyIdsForScrim(scrimId);
    let count = 0;

    for (const entry of this.lobbyEntries.values()) {
      if (lobbyIds.has(entry.lobbyId)) {
        count += 1;
      }
    }

    return count;
  }

  async createGroup(input: CreateGroupInput) {
    for (const group of this.groups.values()) {
      if (group.tierId === input.tierId && group.name.localeCompare(input.name, undefined, { sensitivity: "accent" }) === 0) {
        throw new ApiError(409, "GROUP_ALREADY_EXISTS", "A group with this name already exists for the selected tier.");
      }
    }

    const group: GroupRecord = {
      ...input,
      id: randomUUID(),
    };

    this.groups.set(group.id, group);
    return clone(group);
  }

  async createLobby(input: CreateLobbyInput) {
    for (const lobby of this.lobbies.values()) {
      if (lobby.groupId === input.groupId && lobby.name.localeCompare(input.name, undefined, { sensitivity: "accent" }) === 0) {
        throw new ApiError(409, "LOBBY_ALREADY_EXISTS", "A lobby with this name already exists for the selected group.");
      }
    }

    const lobby: LobbyRecord = {
      ...input,
      id: randomUUID(),
      lastUpdatedByUserId: null,
      lastUpdatedByUsername: null,
    };

    this.lobbies.set(lobby.id, lobby);
    return clone(lobby);
  }

  async createMergePreset(input: CreateMergePresetInput) {
    for (const preset of this.mergePresets.values()) {
      if (preset.scrimId === input.scrimId && preset.name.localeCompare(input.name, undefined, { sensitivity: "accent" }) === 0) {
        throw new ApiError(
          409,
          "MERGE_PRESET_ALREADY_EXISTS",
          "A merge preset with this name already exists for the selected scrim.",
        );
      }
    }

    if (input.isFavorite) {
      for (const preset of this.mergePresets.values()) {
        if (preset.scrimId === input.scrimId) {
          preset.isFavorite = false;
        }
      }
    }

    const preset: MergePresetRecord = {
      createdAt: input.createdAt,
      id: randomUUID(),
      isFavorite: input.isFavorite,
      lobbyIds: [...new Set(input.lobbyIds)],
      name: input.name,
      scrimId: input.scrimId,
      updatedAt: input.updatedAt,
    };

    this.mergePresets.set(preset.id, preset);
    this.mergePresetLobbyIds.set(preset.id, preset.lobbyIds);

    return clone(preset);
  }

  async createScrim(input: CreateScrimInput) {
    for (const scrim of this.scrims.values()) {
      if (scrim.slug === input.slug) {
        throw new ApiError(409, "SCRIM_ALREADY_EXISTS", "A scrim with this name already exists.");
      }
    }

    const scrim: ScrimRecord = {
      ...input,
      id: randomUUID(),
    };

    this.scrims.set(scrim.id, scrim);
    return clone(scrim);
  }

  async createTier(input: CreateTierInput) {
    for (const tier of this.tiers.values()) {
      if (tier.scrimId === input.scrimId && tier.name.localeCompare(input.name, undefined, { sensitivity: "accent" }) === 0) {
        throw new ApiError(409, "TIER_ALREADY_EXISTS", "A tier with this name already exists for the selected scrim.");
      }
    }

    const tier: TierRecord = {
      ...input,
      id: randomUUID(),
    };

    this.tiers.set(tier.id, tier);
    return clone(tier);
  }

  async deleteGroup(id: string) {
    const group = this.groups.get(id);

    if (!group) {
      return null;
    }

    const lobbyIds = [...this.lobbies.values()].filter((lobby) => lobby.groupId === id).map((lobby) => lobby.id);
    for (const lobbyId of lobbyIds) {
      await this.deleteLobby(lobbyId);
    }

    this.groups.delete(id);
    return clone(group);
  }

  async deleteLobby(id: string) {
    const lobby = this.lobbies.get(id);

    if (!lobby) {
      return null;
    }

    for (const [entryId, entry] of this.lobbyEntries.entries()) {
      if (entry.lobbyId === id) {
        this.lobbyEntries.delete(entryId);
      }
    }

    for (const preset of this.mergePresets.values()) {
      preset.lobbyIds = preset.lobbyIds.filter((lobbyId) => lobbyId !== id);
      this.mergePresetLobbyIds.set(preset.id, preset.lobbyIds);
    }

    this.lobbies.delete(id);
    return clone(lobby);
  }

  async deleteMergePreset(id: string) {
    const preset = await this.findMergePresetById(id);

    if (!preset) {
      return null;
    }

    this.mergePresets.delete(id);
    this.mergePresetLobbyIds.delete(id);
    return preset;
  }

  async deleteScrim(id: string) {
    const scrim = this.scrims.get(id);

    if (!scrim) {
      return null;
    }

    const tierIds = [...this.tiers.values()].filter((tier) => tier.scrimId === id).map((tier) => tier.id);
    for (const tierId of tierIds) {
      await this.deleteTier(tierId);
    }

    for (const preset of [...this.mergePresets.values()].filter((preset) => preset.scrimId === id)) {
      await this.deleteMergePreset(preset.id);
    }

    this.scrims.delete(id);
    return clone(scrim);
  }

  async deleteTier(id: string) {
    const tier = this.tiers.get(id);

    if (!tier) {
      return null;
    }

    const groupIds = [...this.groups.values()].filter((group) => group.tierId === id).map((group) => group.id);
    for (const groupId of groupIds) {
      await this.deleteGroup(groupId);
    }

    this.tiers.delete(id);
    return clone(tier);
  }

  async findGroupById(id: string) {
    const group = this.groups.get(id);
    return group ? clone(group) : null;
  }

  async findLobbyById(id: string) {
    const lobby = this.lobbies.get(id);
    return lobby ? clone(lobby) : null;
  }

  async findMergePresetById(id: string) {
    const preset = this.mergePresets.get(id);
    return preset ? clone({ ...preset, lobbyIds: this.mergePresetLobbyIds.get(id) ?? [] }) : null;
  }

  async findScrimById(id: string) {
    const scrim = this.scrims.get(id);
    return scrim ? clone(scrim) : null;
  }

  async findTierById(id: string) {
    const tier = this.tiers.get(id);
    return tier ? clone(tier) : null;
  }

  async getMergeSourceCollectionsByLobbyIds(lobbyIds: string[]): Promise<MergeSourceCollectionsResult> {
    const collections: MergeSourceCollection[] = [];

    for (const lobbyId of [...new Set(lobbyIds)]) {
      const lobby = this.lobbies.get(lobbyId);

      if (!lobby) {
        continue;
      }

      collections.push({
        entries: [...this.lobbyEntries.values()]
          .filter((entry) => entry.lobbyId === lobby.id)
          .map((entry) => ({
            kills: entry.kills,
            position: entry.position,
            slotNumber: entry.slotNumber,
            teamName: entry.teamName,
          })),
        lobbyId: lobby.id,
        lobbyName: lobby.name,
      });
    }

    return {
      collections,
      preset: null,
    };
  }

  async getMergeSourceCollectionsByPresetId(presetId: string): Promise<MergeSourceCollectionsResult> {
    const preset = await this.findMergePresetById(presetId);

    if (!preset) {
      return {
        collections: [],
        preset: null,
      };
    }

    const collections = await this.getMergeSourceCollectionsByLobbyIds(preset.lobbyIds);
    return {
      collections: collections.collections,
      preset,
    };
  }

  async listState(): Promise<ScrimsState> {
    return {
      groups: [...this.groups.values()]
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
        .map(clone),
      lobbies: [...this.lobbies.values()]
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
        .map(clone),
      lobbyEntries: [...this.lobbyEntries.values()]
        .sort((left, right) => left.rank - right.rank || left.teamName.localeCompare(right.teamName))
        .map(clone),
      mergePresets: [...this.mergePresets.values()]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((preset) =>
          clone({
            ...preset,
            lobbyIds: this.mergePresetLobbyIds.get(preset.id) ?? [],
          }),
        ),
      scrims: [...this.scrims.values()].sort((left, right) => left.name.localeCompare(right.name)).map(clone),
      tiers: [...this.tiers.values()]
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
        .map(clone),
    };
  }

  async replaceLobbyEntries(input: ReplaceLobbyEntriesInput) {
    const lobby = this.lobbies.get(input.lobbyId);

    if (!lobby) {
      throw new Error("Lobby not found during update.");
    }

    if (input.expectedUpdatedAt && lobby.updatedAt !== input.expectedUpdatedAt) {
      throw new LobbyStateConflictError(clone(lobby), input.expectedUpdatedAt);
    }

    for (const [entryId, entry] of this.lobbyEntries.entries()) {
      if (entry.lobbyId === input.lobbyId) {
        this.lobbyEntries.delete(entryId);
      }
    }

    const nextEntries = input.entries.map<LobbyEntryRecord>((entry) => ({
      ...entry,
      id: randomUUID(),
      lobbyId: input.lobbyId,
    }));

    for (const entry of nextEntries) {
      this.lobbyEntries.set(entry.id, entry);
    }

    lobby.lastUpdatedByUserId = input.lastUpdatedByUserId;
    lobby.lastUpdatedByUsername = input.lastUpdatedByUsername;
    lobby.updatedAt = input.nextUpdatedAt;

    return {
      entries: nextEntries.map(clone),
      lobby: clone(lobby),
    };
  }

  async updateGroupName(id: string, name: string, updatedAt: string) {
    const group = this.groups.get(id);

    if (!group) {
      return null;
    }

    group.name = name;
    group.updatedAt = updatedAt;
    return clone(group);
  }

  async updateLobbyName(id: string, name: string, updatedAt: string) {
    const lobby = this.lobbies.get(id);

    if (!lobby) {
      return null;
    }

    lobby.name = name;
    lobby.updatedAt = updatedAt;
    return clone(lobby);
  }

  async updateMergePresetName(id: string, name: string, updatedAt: string) {
    const preset = this.mergePresets.get(id);

    if (!preset) {
      return null;
    }

    preset.name = name;
    preset.updatedAt = updatedAt;
    return clone(preset);
  }

  async updateScrim(id: string, name: string, slug: string, updatedAt: string) {
    const scrim = this.scrims.get(id);

    if (!scrim) {
      return null;
    }

    scrim.name = name;
    scrim.slug = slug;
    scrim.updatedAt = updatedAt;
    return clone(scrim);
  }

  async updateTierName(id: string, name: string, updatedAt: string) {
    const tier = this.tiers.get(id);

    if (!tier) {
      return null;
    }

    tier.name = name;
    tier.updatedAt = updatedAt;
    return clone(tier);
  }

  private getLobbyIdsForScrim(scrimId: string) {
    const tierIds = new Set(
      [...this.tiers.values()].filter((tier) => tier.scrimId === scrimId).map((tier) => tier.id),
    );
    const groupIds = new Set(
      [...this.groups.values()].filter((group) => tierIds.has(group.tierId)).map((group) => group.id),
    );

    return new Set(
      [...this.lobbies.values()].filter((lobby) => groupIds.has(lobby.groupId)).map((lobby) => lobby.id),
    );
  }
}
