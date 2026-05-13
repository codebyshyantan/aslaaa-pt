export interface PointSystemSettings {
  killPointValue: number;
  positionPoints: number[];
}

export interface EditableLobbyEntryInput {
  kills: number;
  position: number | null;
  slotNumber: number | null;
  teamName: string;
}

export interface RankedLobbyEntry extends EditableLobbyEntryInput {
  lobbyIds: string[];
  lobbyNames: string[];
  matchesPlayed: number;
  normalizedTeamName: string;
  placementPoints: number;
  rank: number;
  totalPoints: number;
}

export interface MergeSourceCollection {
  entries: EditableLobbyEntryInput[];
  lobbyId: string;
  lobbyName: string;
}

export const defaultPointSystemSettings: PointSystemSettings = {
  killPointValue: 1,
  positionPoints: [15, 12, 10, 8, 6, 4, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0],
};

export function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function sanitizeCompetitionTeamName(value: string) {
  return collapseWhitespace(value);
}

export function normalizeCompetitionTeamName(value: string) {
  return sanitizeCompetitionTeamName(value).toUpperCase();
}

export function calculatePlacementPoints(position: number | null, settings: PointSystemSettings) {
  if (!position || position < 1) {
    return 0;
  }

  return settings.positionPoints[position - 1] ?? 0;
}

function compareRankedEntries(left: RankedLobbyEntry, right: RankedLobbyEntry) {
  if (right.totalPoints !== left.totalPoints) {
    return right.totalPoints - left.totalPoints;
  }

  if (right.kills !== left.kills) {
    return right.kills - left.kills;
  }

  if (right.placementPoints !== left.placementPoints) {
    return right.placementPoints - left.placementPoints;
  }

  const leftPosition = left.position ?? Number.MAX_SAFE_INTEGER;
  const rightPosition = right.position ?? Number.MAX_SAFE_INTEGER;

  if (leftPosition !== rightPosition) {
    return leftPosition - rightPosition;
  }

  return left.normalizedTeamName.localeCompare(right.normalizedTeamName);
}

export function buildLobbyStandings(
  entries: EditableLobbyEntryInput[],
  settings: PointSystemSettings,
  source?: { lobbyId: string; lobbyName: string },
) {
  const rankedEntries = entries
    .filter((entry) => sanitizeCompetitionTeamName(entry.teamName).length > 0)
    .map<RankedLobbyEntry>((entry) => {
      const placementPoints = calculatePlacementPoints(entry.position, settings);
      const teamName = sanitizeCompetitionTeamName(entry.teamName);

      return {
        kills: entry.kills,
        lobbyIds: source ? [source.lobbyId] : [],
        lobbyNames: source ? [source.lobbyName] : [],
        matchesPlayed: 1,
        normalizedTeamName: normalizeCompetitionTeamName(teamName),
        placementPoints,
        position: entry.position,
        rank: 0,
        slotNumber: entry.slotNumber,
        teamName,
        totalPoints: placementPoints + entry.kills * settings.killPointValue,
      };
    })
    .sort(compareRankedEntries)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return rankedEntries;
}

export function mergeStandings(collections: MergeSourceCollection[], settings: PointSystemSettings) {
  const aggregate = new Map<string, RankedLobbyEntry>();

  for (const collection of collections) {
    const rankedEntries = buildLobbyStandings(collection.entries, settings, {
      lobbyId: collection.lobbyId,
      lobbyName: collection.lobbyName,
    });

    for (const entry of rankedEntries) {
      const existing = aggregate.get(entry.normalizedTeamName);

      if (!existing) {
        aggregate.set(entry.normalizedTeamName, {
          ...entry,
        });
        continue;
      }

      existing.kills += entry.kills;
      existing.placementPoints += entry.placementPoints;
      existing.totalPoints += entry.totalPoints;
      existing.matchesPlayed += 1;
      existing.lobbyIds = [...existing.lobbyIds, ...entry.lobbyIds];
      existing.lobbyNames = [...existing.lobbyNames, ...entry.lobbyNames];
      existing.position =
        existing.position === null
          ? entry.position
          : entry.position === null
            ? existing.position
            : Math.min(existing.position, entry.position);
      existing.slotNumber =
        existing.slotNumber === null
          ? entry.slotNumber
          : entry.slotNumber === null
            ? existing.slotNumber
            : Math.min(existing.slotNumber, entry.slotNumber);
    }
  }

  return [...aggregate.values()]
    .sort(compareRankedEntries)
    .map((entry, index) => ({
      ...entry,
      lobbyIds: [...new Set(entry.lobbyIds)],
      lobbyNames: [...new Set(entry.lobbyNames)],
      rank: index + 1,
    }));
}

export function hasMeaningfulLobbyData(entries: EditableLobbyEntryInput[]) {
  return entries.some((entry) => {
    const hasTeam = sanitizeCompetitionTeamName(entry.teamName).length > 0;
    return hasTeam || entry.kills > 0 || entry.position !== null;
  });
}
