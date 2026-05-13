import type {
  MergeSourceCollection,
  PointSystemSettings,
  RankedLobbyEntry,
} from "../../contracts/competition-contract.js";

export interface ScrimRecord {
  createdAt: string;
  description: string | null;
  id: string;
  isActive: boolean;
  name: string;
  slug: string;
  updatedAt: string;
}

export interface TierRecord {
  createdAt: string;
  id: string;
  name: string;
  scrimId: string;
  sortOrder: number;
  updatedAt: string;
}

export interface GroupRecord {
  createdAt: string;
  id: string;
  name: string;
  sortOrder: number;
  tierId: string;
  updatedAt: string;
}

export interface LobbyRecord {
  createdAt: string;
  groupId: string;
  id: string;
  name: string;
  sortOrder: number;
  updatedAt: string;
}

export interface LobbyEntryRecord {
  createdAt: string;
  id: string;
  kills: number;
  lobbyId: string;
  normalizedTeamName: string;
  placementPoints: number;
  position: number | null;
  rank: number;
  slotNumber: number | null;
  teamName: string;
  totalPoints: number;
  updatedAt: string;
}

export interface MergePresetRecord {
  createdAt: string;
  id: string;
  isFavorite: boolean;
  lobbyIds: string[];
  name: string;
  scrimId: string;
  updatedAt: string;
}

export interface ScrimsState {
  groups: GroupRecord[];
  lobbies: LobbyRecord[];
  lobbyEntries: LobbyEntryRecord[];
  mergePresets: MergePresetRecord[];
  scrims: ScrimRecord[];
  tiers: TierRecord[];
}

export interface MergePreviewResponse {
  lobbies: Array<{
    entryCount: number;
    id: string;
    name: string;
  }>;
  pointSystem: PointSystemSettings;
  preset: MergePresetRecord | null;
  standings: RankedLobbyEntry[];
}

export interface CreateScrimInput {
  createdAt: string;
  description: string | null;
  isActive: boolean;
  name: string;
  slug: string;
  updatedAt: string;
}

export interface CreateTierInput {
  createdAt: string;
  name: string;
  scrimId: string;
  sortOrder: number;
  updatedAt: string;
}

export interface CreateGroupInput {
  createdAt: string;
  name: string;
  sortOrder: number;
  tierId: string;
  updatedAt: string;
}

export interface CreateLobbyInput {
  createdAt: string;
  groupId: string;
  name: string;
  sortOrder: number;
  updatedAt: string;
}

export interface CreateLobbyEntryInput {
  createdAt: string;
  kills: number;
  normalizedTeamName: string;
  placementPoints: number;
  position: number | null;
  rank: number;
  slotNumber: number | null;
  teamName: string;
  totalPoints: number;
  updatedAt: string;
}

export interface CreateMergePresetInput {
  createdAt: string;
  isFavorite: boolean;
  lobbyIds: string[];
  name: string;
  scrimId: string;
  updatedAt: string;
}

export interface ReplaceLobbyEntriesInput {
  entries: CreateLobbyEntryInput[];
  lobbyId: string;
}

export interface MergeSourceCollectionsResult {
  collections: MergeSourceCollection[];
  preset: MergePresetRecord | null;
}
