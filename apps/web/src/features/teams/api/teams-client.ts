import { apiRequest } from "@/lib/http-client";

export interface TeamRecord {
  createdAt: string;
  displayName: string;
  id: string;
  normalizedName: string;
}

export interface TeamImportDuplicate {
  displayName: string;
  lineNumber: number;
  normalizedName: string;
  originalLine: string;
  reason: "ALREADY_EXISTS" | "DUPLICATE_IN_IMPORT";
  slotNumber: number;
}

export interface TeamImportInvalidLine {
  lineNumber: number;
  originalLine: string;
  reason: "COMMENT" | "INVALID_FORMAT" | "INVALID_NAME";
}

export interface TeamImportResult {
  addedCount: number;
  addedTeams: TeamRecord[];
  duplicateCount: number;
  duplicates: TeamImportDuplicate[];
  invalidCount: number;
  invalidLines: TeamImportInvalidLine[];
  parsedCount: number;
}

export function fetchTeams() {
  return apiRequest<{ teams: TeamRecord[] }>("/teams", {
    method: "GET",
  });
}

export function importTeams(rawInput: string) {
  return apiRequest<TeamImportResult>("/teams/import", {
    body: JSON.stringify({ rawInput }),
    method: "POST",
  });
}
