import { mergeStandings } from "@contracts/competition-contract";
import { FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { fetchActivityLogs } from "@/features/activity/api/activity-client";
import { fetchAchievements } from "@/features/achievements/api/achievements-client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchAutoMergeRuns, fetchDailySnapshots, fetchPointSystemSettings } from "@/features/settings/api/settings-client";
import { fetchScrimsState } from "@/features/scrims/api/scrims-client";
import { fetchSuggestions } from "@/features/suggestions/api/suggestions-client";
import { fetchTeams } from "@/features/teams/api/teams-client";

type AggregatedStanding = {
  kills: number;
  matches: number;
  teamName: string;
  totalPoints: number;
};

function getIsoWeekKey(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  const target = new Date(date.valueOf());
  const dayNumber = (date.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNumber + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNumber = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNumber + 3);
  const weekNumber = 1 + Math.round((target.valueOf() - firstThursday.valueOf()) / 604800000);
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function getSnapshotStandings(snapshot: Awaited<ReturnType<typeof fetchDailySnapshots>>["snapshots"][number]) {
  return Array.isArray(snapshot.standingsJson.teams)
    ? snapshot.standingsJson.teams.filter(
        (entry): entry is { kills: number; teamName: string; totalPoints: number } =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as { teamName?: unknown }).teamName === "string" &&
          typeof (entry as { totalPoints?: unknown }).totalPoints === "number" &&
          typeof (entry as { kills?: unknown }).kills === "number",
      )
    : [];
}

function aggregateStandings(snapshots: Awaited<ReturnType<typeof fetchDailySnapshots>>["snapshots"]) {
  const aggregate = new Map<string, AggregatedStanding>();

  for (const snapshot of snapshots) {
    for (const entry of getSnapshotStandings(snapshot)) {
      const key = entry.teamName.toUpperCase();
      const current = aggregate.get(key);

      if (!current) {
        aggregate.set(key, {
          kills: entry.kills,
          matches: 1,
          teamName: entry.teamName,
          totalPoints: entry.totalPoints,
        });
        continue;
      }

      current.kills += entry.kills;
      current.matches += 1;
      current.totalPoints += entry.totalPoints;
    }
  }

  return [...aggregate.values()].sort(
    (left, right) => right.totalPoints - left.totalPoints || right.kills - left.kills || left.teamName.localeCompare(right.teamName),
  );
}

async function exportWorkbook(isAdmin: boolean) {
  const xlsx = await import("xlsx");
  const [teams, suggestions, achievements, snapshotsResponse, scrimsState, pointSystem, runs, activity] = await Promise.all([
    isAdmin ? fetchTeams() : Promise.resolve({ teams: [] }),
    fetchSuggestions(),
    fetchAchievements(),
    fetchDailySnapshots(),
    fetchScrimsState(),
    fetchPointSystemSettings(),
    fetchAutoMergeRuns(),
    fetchActivityLogs(100),
  ]);

  const workbook = xlsx.utils.book_new();
  const lobbyMap = new Map(scrimsState.lobbies.map((lobby) => [lobby.id, lobby]));
  const groupMap = new Map(scrimsState.groups.map((group) => [group.id, group]));
  const tierMap = new Map(scrimsState.tiers.map((tier) => [tier.id, tier]));
  const scrimMap = new Map(scrimsState.scrims.map((scrim) => [scrim.id, scrim]));

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.json_to_sheet(
      scrimsState.lobbyEntries.map((entry) => {
        const lobby = lobbyMap.get(entry.lobbyId);
        const group = lobby ? groupMap.get(lobby.groupId) : null;
        const tier = group ? tierMap.get(group.tierId) : null;
        const scrim = tier ? scrimMap.get(tier.scrimId) : null;

        return {
          Group: group?.name ?? "",
          Kills: entry.kills,
          Lobby: lobby?.name ?? entry.lobbyId,
          Position: entry.position ?? "",
          Rank: entry.rank,
          Scrim: scrim?.name ?? "",
          Slot: entry.slotNumber ?? "",
          Team: entry.teamName,
          Tier: tier?.name ?? "",
          Total: entry.totalPoints,
        };
      }),
    ),
    "Lobby PT",
  );

  const mergeRows = scrimsState.mergePresets.flatMap((preset) => {
    const collections = preset.lobbyIds.map((lobbyId) => {
      const lobby = lobbyMap.get(lobbyId);
      return {
        entries: scrimsState.lobbyEntries
          .filter((entry) => entry.lobbyId === lobbyId)
          .map((entry) => ({
            kills: entry.kills,
            position: entry.position,
            slotNumber: entry.slotNumber,
            teamName: entry.teamName,
          })),
        lobbyId,
        lobbyName: lobby?.name ?? lobbyId,
      };
    });
    const standings = mergeStandings(collections, pointSystem);

    return standings.map((entry) => ({
      Kills: entry.kills,
      Matches: entry.matchesPlayed,
      Merge: preset.name,
      Rank: entry.rank,
      Scrim: scrimMap.get(preset.scrimId)?.name ?? preset.scrimId,
      Team: entry.teamName,
      Total: entry.totalPoints,
    }));
  });

  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(mergeRows), "Merge PT");

  const weeklyRows = [...new Set(snapshotsResponse.snapshots.map((snapshot) => getIsoWeekKey(snapshot.date)))].flatMap(
    (weekKey) =>
      aggregateStandings(snapshotsResponse.snapshots.filter((snapshot) => getIsoWeekKey(snapshot.date) === weekKey)).map((entry, index) => ({
        Kills: entry.kills,
        Matches: entry.matches,
        Rank: index + 1,
        Team: entry.teamName,
        Total: entry.totalPoints,
        Week: weekKey,
      })),
  );
  xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(weeklyRows), "Weekly PT");

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.json_to_sheet(
      aggregateStandings(snapshotsResponse.snapshots).map((entry, index) => ({
        Kills: entry.kills,
        Matches: entry.matches,
        Rank: index + 1,
        Team: entry.teamName,
        Total: entry.totalPoints,
      })),
    ),
    "Tournament PT",
  );

  if (isAdmin) {
    xlsx.utils.book_append_sheet(
      workbook,
      xlsx.utils.json_to_sheet(
        teams.teams.map((team) => ({
          "Created At": team.createdAt,
          "Display Name": team.displayName,
          "Normalized Name": team.normalizedName,
        })),
      ),
      "Unique Teams",
    );
  }

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.json_to_sheet(
      activity.logs
        .filter((log) => log.module === "UNIQUE_TEAMS")
        .map((log) => ({
          Actor: log.actorUsername ?? "SYSTEM",
          CreatedAt: log.createdAt,
          Description: log.description,
          Module: log.module,
        })),
    ),
    "Import Reports",
  );

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.json_to_sheet(
      runs.runs.map((run) => ({
        ConfigId: run.configId,
        CreatedAt: run.createdAt,
        MergeId: run.mergeId,
        RunDate: run.runDate,
        SnapshotId: run.snapshotId ?? "",
        Status: run.status,
      })),
    ),
    "Automation Runs",
  );

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.json_to_sheet(
      suggestions.suggestions.map((entry) => ({
        CreatedAt: entry.createdAt,
        Role: entry.submittedByRole,
        Status: entry.status,
        SubmittedBy: entry.submittedByUsername,
        Title: entry.title,
      })),
    ),
    "Suggestions",
  );

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.json_to_sheet(
      achievements.achievements.map((entry) => ({
        CreatedAt: entry.createdAt,
        CreatedBy: entry.createdByUsername,
        Description: entry.description,
        Title: entry.title,
      })),
    ),
    "Achievements",
  );

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.json_to_sheet(
      snapshotsResponse.snapshots.map((entry) => ({
        CreatedAt: entry.createdAt,
        Date: entry.date,
        Day: entry.dayName,
        MergeId: entry.mergeId,
        ScrimId: entry.scrimId,
      })),
    ),
    "Snapshots",
  );

  xlsx.writeFile(workbook, "aslaaa-pt-exports.xlsx");
}

export function ExportsPage() {
  const { session } = useAuth();
  const isAdmin = session?.user.role === "ADMIN";

  return (
    <section className="space-y-5">
      <Panel className="p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Workbook Export</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">Exports</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Generate the operational workbook used outside the app: live lobby PT, merge PT, weekly PT, tournament PT, unique teams, automation history, and import reports.
        </p>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <div className="space-y-4">
          <p className="text-sm font-semibold text-white">Workbook Output</p>
          <p className="text-sm leading-7 text-slate-300">
            The export uses the stored scoring state and immutable snapshots to produce downstream-ready sheets for competition ops and historical reporting.
          </p>
          <Button className="sm:w-auto" onClick={() => void exportWorkbook(isAdmin)}>
            <FileSpreadsheet className="mr-2 size-4" />
            Export Excel Workbook
          </Button>
        </div>
      </Panel>
    </section>
  );
}
