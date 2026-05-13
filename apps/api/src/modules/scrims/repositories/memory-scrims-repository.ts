import { randomUUID } from "node:crypto";

import { ApiError } from "../../../lib/http/api-error.js";
import type { MergeSourceCollection } from "../../../contracts/competition-contract.js";
import type { ScrimsRepository } from "../scrims.repository.js";
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

    return nextEntries.map(clone);
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
