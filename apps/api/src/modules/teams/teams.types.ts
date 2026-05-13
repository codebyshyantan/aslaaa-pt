export interface TeamRecord {
  createdAt: string;
  displayName: string;
  id: string;
  normalizedName: string;
}

export interface ParsedTeamImportLine {
  displayName: string;
  lineNumber: number;
  normalizedName: string;
  originalLine: string;
  slotNumber: number;
}

export type TeamImportDuplicateReason = "ALREADY_EXISTS" | "DUPLICATE_IN_IMPORT";

export type TeamImportInvalidReason = "COMMENT" | "INVALID_FORMAT" | "INVALID_NAME";

export interface TeamImportDuplicate {
  displayName: string;
  lineNumber: number;
  normalizedName: string;
  originalLine: string;
  reason: TeamImportDuplicateReason;
  slotNumber: number;
}

export interface TeamImportInvalidLine {
  lineNumber: number;
  originalLine: string;
  reason: TeamImportInvalidReason;
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

export interface CreateTeamInput {
  createdAt: string;
  displayName: string;
  normalizedName: string;
}
