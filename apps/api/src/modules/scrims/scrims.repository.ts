import type { Sql } from "postgres";

import { MemoryScrimsRepository } from "./repositories/memory-scrims-repository.js";
import { PostgresScrimsRepository } from "./repositories/postgres-scrims-repository.js";
import type {
  CreateGroupInput,
  CreateLobbyInput,
  CreateMergePresetInput,
  CreateScrimInput,
  CreateTierInput,
  GroupRecord,
  LobbyRecord,
  MergePresetRecord,
  MergeSourceCollectionsResult,
  ReplaceLobbyEntriesInput,
  ScrimRecord,
  ScrimsState,
  TierRecord,
} from "./scrims.types.js";

export class LobbyStateConflictError extends Error {
  constructor(
    public readonly currentLobby: LobbyRecord,
    public readonly expectedUpdatedAt: string | null,
  ) {
    super("Lobby state conflict");
    this.name = "LobbyStateConflictError";
  }
}

export interface ScrimsRepository {
  clearLobbyEntriesForScrim(scrimId: string): Promise<void>;
  countEntriesForScrim(scrimId: string): Promise<number>;
  createGroup(input: CreateGroupInput): Promise<GroupRecord>;
  createLobby(input: CreateLobbyInput): Promise<LobbyRecord>;
  createMergePreset(input: CreateMergePresetInput): Promise<MergePresetRecord>;
  createScrim(input: CreateScrimInput): Promise<ScrimRecord>;
  createTier(input: CreateTierInput): Promise<TierRecord>;
  deleteGroup(id: string): Promise<GroupRecord | null>;
  deleteLobby(id: string): Promise<LobbyRecord | null>;
  deleteMergePreset(id: string): Promise<MergePresetRecord | null>;
  deleteScrim(id: string): Promise<ScrimRecord | null>;
  deleteTier(id: string): Promise<TierRecord | null>;
  findGroupById(id: string): Promise<GroupRecord | null>;
  findLobbyById(id: string): Promise<LobbyRecord | null>;
  findMergePresetById(id: string): Promise<MergePresetRecord | null>;
  findScrimById(id: string): Promise<ScrimRecord | null>;
  findTierById(id: string): Promise<TierRecord | null>;
  getMergeSourceCollectionsByLobbyIds(lobbyIds: string[]): Promise<MergeSourceCollectionsResult>;
  getMergeSourceCollectionsByPresetId(presetId: string): Promise<MergeSourceCollectionsResult>;
  listState(): Promise<ScrimsState>;
  replaceLobbyEntries(input: ReplaceLobbyEntriesInput): Promise<{
    entries: ScrimsState["lobbyEntries"];
    lobby: LobbyRecord;
  }>;
  updateGroupName(id: string, name: string, updatedAt: string): Promise<GroupRecord | null>;
  updateLobbyName(id: string, name: string, updatedAt: string): Promise<LobbyRecord | null>;
  updateMergePresetName(id: string, name: string, updatedAt: string): Promise<MergePresetRecord | null>;
  updateScrim(id: string, name: string, slug: string, updatedAt: string): Promise<ScrimRecord | null>;
  updateTierName(id: string, name: string, updatedAt: string): Promise<TierRecord | null>;
}

export function createScrimsRepository(storageDriver: "memory" | "postgres", sql?: Sql) {
  if (storageDriver === "memory") {
    return new MemoryScrimsRepository();
  }

  if (!sql) {
    throw new Error("A Postgres SQL client is required for the scrims repository.");
  }

  return PostgresScrimsRepository.fromSql(sql);
}
