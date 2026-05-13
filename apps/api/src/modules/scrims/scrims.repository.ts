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

export interface ScrimsRepository {
  clearLobbyEntriesForScrim(scrimId: string): Promise<void>;
  countEntriesForScrim(scrimId: string): Promise<number>;
  createGroup(input: CreateGroupInput): Promise<GroupRecord>;
  createLobby(input: CreateLobbyInput): Promise<LobbyRecord>;
  createMergePreset(input: CreateMergePresetInput): Promise<MergePresetRecord>;
  createScrim(input: CreateScrimInput): Promise<ScrimRecord>;
  createTier(input: CreateTierInput): Promise<TierRecord>;
  findGroupById(id: string): Promise<GroupRecord | null>;
  findLobbyById(id: string): Promise<LobbyRecord | null>;
  findMergePresetById(id: string): Promise<MergePresetRecord | null>;
  findScrimById(id: string): Promise<ScrimRecord | null>;
  findTierById(id: string): Promise<TierRecord | null>;
  getMergeSourceCollectionsByLobbyIds(lobbyIds: string[]): Promise<MergeSourceCollectionsResult>;
  getMergeSourceCollectionsByPresetId(presetId: string): Promise<MergeSourceCollectionsResult>;
  listState(): Promise<ScrimsState>;
  replaceLobbyEntries(input: ReplaceLobbyEntriesInput): Promise<ScrimsState["lobbyEntries"]>;
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
