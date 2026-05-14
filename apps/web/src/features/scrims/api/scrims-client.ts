import type { PointSystemSettings, RankedLobbyEntry } from "@contracts/competition-contract";

import { apiRequest } from "@/lib/http-client";

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
  lastUpdatedByUserId: string | null;
  lastUpdatedByUsername: string | null;
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

export interface EditableLobbyEntryPayload {
  kills: number;
  position: number | null;
  slotNumber: number | null;
  teamName: string;
}

export function fetchScrimsState() {
  return apiRequest<ScrimsState>("/scrims", {
    method: "GET",
  });
}

export function createScrim(payload: { description: string; name: string }) {
  return apiRequest<ScrimRecord>("/scrims", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function renameScrim(id: string, name: string) {
  return apiRequest<ScrimRecord>(`/scrims/${id}`, {
    body: JSON.stringify({ name }),
    method: "PATCH",
  });
}

export function deleteScrim(id: string) {
  return apiRequest<ScrimRecord>(`/scrims/${id}`, {
    body: JSON.stringify({ confirmCascade: true }),
    method: "DELETE",
  });
}

export function createTier(payload: { name: string; scrimId: string; sortOrder: number }) {
  return apiRequest<TierRecord>("/scrims/tiers", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function renameTier(id: string, name: string) {
  return apiRequest<TierRecord>(`/scrims/tiers/${id}`, {
    body: JSON.stringify({ name }),
    method: "PATCH",
  });
}

export function deleteTier(id: string) {
  return apiRequest<TierRecord>(`/scrims/tiers/${id}`, {
    body: JSON.stringify({ confirmCascade: true }),
    method: "DELETE",
  });
}

export function createGroup(payload: { name: string; sortOrder: number; tierId: string }) {
  return apiRequest<GroupRecord>("/scrims/groups", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function renameGroup(id: string, name: string) {
  return apiRequest<GroupRecord>(`/scrims/groups/${id}`, {
    body: JSON.stringify({ name }),
    method: "PATCH",
  });
}

export function deleteGroup(id: string) {
  return apiRequest<GroupRecord>(`/scrims/groups/${id}`, {
    body: JSON.stringify({ confirmCascade: true }),
    method: "DELETE",
  });
}

export function createLobby(payload: { groupId: string; name: string; sortOrder: number }) {
  return apiRequest<LobbyRecord>("/scrims/lobbies", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function renameLobby(id: string, name: string) {
  return apiRequest<LobbyRecord>(`/scrims/lobbies/${id}`, {
    body: JSON.stringify({ name }),
    method: "PATCH",
  });
}

export function deleteLobby(id: string) {
  return apiRequest<LobbyRecord>(`/scrims/lobbies/${id}`, {
    body: JSON.stringify({ confirmCascade: true }),
    method: "DELETE",
  });
}

export function replaceLobbyEntries(
  lobbyId: string,
  entries: EditableLobbyEntryPayload[],
  expectedUpdatedAt: string | null,
) {
  return apiRequest<{ entries: LobbyEntryRecord[]; lobby: LobbyRecord }>(`/scrims/lobbies/${lobbyId}/entries`, {
    body: JSON.stringify({
      entries,
      expectedUpdatedAt,
    }),
    method: "PUT",
  });
}

export function createMergePreset(payload: {
  isFavorite: boolean;
  lobbyIds: string[];
  name: string;
  scrimId: string;
}) {
  return apiRequest<MergePresetRecord>("/scrims/merge-presets", {
    body: JSON.stringify(payload),
    method: "POST",
  });
}

export function renameMergePreset(id: string, name: string) {
  return apiRequest<MergePresetRecord>(`/scrims/merge-presets/${id}`, {
    body: JSON.stringify({ name }),
    method: "PATCH",
  });
}

export function deleteMergePreset(id: string) {
  return apiRequest<MergePresetRecord>(`/scrims/merge-presets/${id}`, {
    body: JSON.stringify({ confirmCascade: true }),
    method: "DELETE",
  });
}

export function previewMerge(lobbyIds: string[]) {
  return apiRequest<MergePreviewResponse>("/scrims/merge-preview", {
    body: JSON.stringify({ lobbyIds }),
    method: "POST",
  });
}

export function fetchMergePresetStandings(id: string) {
  return apiRequest<MergePreviewResponse>(`/scrims/merge-presets/${id}/standings`, {
    method: "GET",
  });
}
