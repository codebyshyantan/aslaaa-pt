import type {
  ParsedTeamImportLine,
  TeamImportInvalidLine,
  TeamImportInvalidReason,
} from "./teams.types.js";

type ExtractedTeamName =
  | {
      reason: TeamImportInvalidReason;
    }
  | {
      slotNumber: number;
      teamName: string;
    }
  | null;

export function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeTeamName(value: string) {
  return collapseWhitespace(value).toUpperCase();
}

export function sanitizeDisplayName(value: string) {
  return collapseWhitespace(value);
}

const strictSlotPattern =
  /^slot\s+(?<slot>\d{1,3})\s*(?:->|:|-)?\s+(?<name>[A-Za-z0-9][A-Za-z0-9 .&()'_-]{1,79})$/i;

function hasValidTeamName(value: string) {
  return /^[A-Za-z0-9][A-Za-z0-9 .&()'_-]{1,79}$/.test(value);
}

export function extractTeamName(rawLine: string): ExtractedTeamName {
  const trimmedLine = rawLine.trim();

  if (!trimmedLine) {
    return null;
  }

  if (trimmedLine.startsWith("#")) {
    return {
      reason: "COMMENT" as const,
    };
  }

  const matchedSlotLine = strictSlotPattern.exec(trimmedLine);

  if (!matchedSlotLine?.groups) {
    return {
      reason: "INVALID_FORMAT" as const,
    };
  }

  const rawTeamName = matchedSlotLine.groups.name;

  if (!rawTeamName) {
    return {
      reason: "INVALID_FORMAT" as const,
    };
  }

  const slotNumber = Number(matchedSlotLine.groups.slot);
  const candidate = sanitizeDisplayName(rawTeamName);

  if (!candidate || !hasValidTeamName(candidate)) {
    return {
      reason: "INVALID_NAME" as const,
    };
  }

  return {
    slotNumber,
    teamName: candidate,
  };
}

export function parseTeamImportInput(rawInput: string): {
  invalidLines: TeamImportInvalidLine[];
  parsedLines: ParsedTeamImportLine[];
} {
  const invalidLines: TeamImportInvalidLine[] = [];
  const parsedLines: ParsedTeamImportLine[] = [];

  for (const [index, line] of rawInput.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const extracted = extractTeamName(line);

    if (!extracted) {
      continue;
    }

    if ("reason" in extracted) {
      invalidLines.push({
        lineNumber,
        originalLine: line,
        reason: extracted.reason,
      });
      continue;
    }

    parsedLines.push({
      displayName: sanitizeDisplayName(extracted.teamName),
      lineNumber,
      normalizedName: normalizeTeamName(extracted.teamName),
      originalLine: line,
      slotNumber: extracted.slotNumber,
    });
  }

  return {
    invalidLines,
    parsedLines,
  };
}
