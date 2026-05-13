import { useEffect, useMemo, useState } from "react";

import { CalendarDays } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { fetchDailySnapshots, type DailySnapshotRecord } from "@/features/settings/api/settings-client";
import { fetchScrimsState } from "@/features/scrims/api/scrims-client";
import { ApiClientError } from "@/lib/http-client";

type SnapshotStandingEntry = {
  kills: number;
  rank: number;
  teamName: string;
  totalPoints: number;
};

type AggregatedStanding = {
  kills: number;
  matches: number;
  teamName: string;
  totalPoints: number;
};

function formatTournamentsError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load the tournament timeline.";
}

function getSnapshotStandings(snapshot: DailySnapshotRecord): SnapshotStandingEntry[] {
  const teams = snapshot.standingsJson.teams;

  if (!Array.isArray(teams)) {
    return [];
  }

  return teams
    .filter(
      (entry): entry is SnapshotStandingEntry =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as { teamName?: unknown }).teamName === "string" &&
        typeof (entry as { totalPoints?: unknown }).totalPoints === "number" &&
        typeof (entry as { kills?: unknown }).kills === "number" &&
        typeof (entry as { rank?: unknown }).rank === "number",
    )
    .map((entry) => ({
      kills: entry.kills,
      rank: entry.rank,
      teamName: entry.teamName,
      totalPoints: entry.totalPoints,
    }));
}

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

function aggregateStandings(snapshots: DailySnapshotRecord[]) {
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

export function TournamentsPage() {
  const [snapshots, setSnapshots] = useState<DailySnapshotRecord[]>([]);
  const [scrimNames, setScrimNames] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const [snapshotsResponse, scrimsState] = await Promise.all([
          fetchDailySnapshots(),
          fetchScrimsState(),
        ]);

        if (!isMounted) {
          return;
        }

        setSnapshots(snapshotsResponse.snapshots);
        setScrimNames(Object.fromEntries(scrimsState.scrims.map((scrim) => [scrim.id, scrim.name])));
      } catch (nextError) {
        if (isMounted) {
          setError(formatTournamentsError(nextError));
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const weeklyGroups = useMemo(() => {
    const grouped = new Map<string, DailySnapshotRecord[]>();

    for (const snapshot of snapshots) {
      const weekKey = getIsoWeekKey(snapshot.date);
      const current = grouped.get(weekKey) ?? [];
      current.push(snapshot);
      grouped.set(weekKey, current);
    }

    return [...grouped.entries()].sort((left, right) => right[0].localeCompare(left[0]));
  }, [snapshots]);

  const tournamentStandings = useMemo(() => aggregateStandings(snapshots), [snapshots]);

  return (
    <section className="space-y-5">
      <Panel className="p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Archives</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">Tournaments & Weekly PT</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Immutable snapshots are rolled up into weekly and cumulative standings so historical point tables remain readable after daily resets clear the live lobbies.
        </p>
        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white">Tournament PT</p>
            {tournamentStandings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                No archived standings exist yet.
              </div>
            ) : (
              tournamentStandings.slice(0, 15).map((entry, index) => (
                <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={`${entry.teamName}-${index}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">
                        #{index + 1} {entry.teamName}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        {entry.matches} snapshots / {entry.kills} kills
                      </p>
                    </div>
                    <p className="font-display text-2xl font-semibold text-cyan-100">{entry.totalPoints}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white">Weekly PT</p>
            {weeklyGroups.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                No weekly archives exist yet.
              </div>
            ) : (
              weeklyGroups.map(([weekKey, weekSnapshots]) => {
                const standings = aggregateStandings(weekSnapshots).slice(0, 5);
                return (
                  <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={weekKey}>
                    <p className="font-semibold text-white">{weekKey}</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-300">
                      {standings.map((entry, index) => (
                        <p key={`${weekKey}-${entry.teamName}`}>
                          #{index + 1} {entry.teamName} - {entry.totalPoints} pts
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>
      </div>

      <Panel className="p-5 sm:p-6">
        <div className="space-y-4">
          <p className="text-sm font-semibold text-white">Daily Snapshot Timeline</p>
          {snapshots.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
              No tournament archives exist yet.
            </div>
          ) : (
            snapshots.map((snapshot) => (
              <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={snapshot.id}>
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
                    <CalendarDays className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-white">
                      {scrimNames[snapshot.scrimId] ?? snapshot.scrimId} - {snapshot.dayName} ({snapshot.date})
                    </p>
                    <p className="text-sm text-slate-300">{getSnapshotStandings(snapshot).length} archived team rows</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Merge {snapshot.mergeId} archived on {new Date(snapshot.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </section>
  );
}
