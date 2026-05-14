import { useEffect, useMemo, useState } from "react";

import { CalendarDays, Pin, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchDailySnapshots, type DailySnapshotRecord } from "@/features/settings/api/settings-client";
import { fetchScrimsState, type ScrimsState } from "@/features/scrims/api/scrims-client";
import { ApiClientError } from "@/lib/http-client";

import {
  fetchWeeklyLeaderboard,
  updateFeaturedLeaderboard,
  type LeaderboardSortBy,
  type WeeklyLeaderboardResponse,
} from "./api/leaderboards-client";

function formatTournamentsError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load the tournament timeline.";
}

async function exportLeaderboard(label: string, leaderboard: WeeklyLeaderboardResponse) {
  const xlsx = await import("xlsx");
  const workbook = xlsx.utils.book_new();

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.json_to_sheet(
      leaderboard.entries.map((entry) => ({
        "Chicken Dinners": entry.chickenDinners,
        Kills: entry.kills,
        Matches: entry.matchesPlayed,
        Rank: entry.rank,
        Team: entry.teamName,
        "Total Points": entry.totalPoints,
      })),
    ),
    "Weekly Leaderboard",
  );

  xlsx.writeFile(workbook, `${label.replace(/\s+/g, "-").toLowerCase()}.xlsx`);
}

export function TournamentsPage() {
  const { session } = useAuth();
  const isAdmin = session?.user.role === "ADMIN";
  const [leaderboard, setLeaderboard] = useState<WeeklyLeaderboardResponse | null>(null);
  const [scrimState, setScrimState] = useState<ScrimsState>({
    groups: [],
    lobbies: [],
    lobbyEntries: [],
    mergePresets: [],
    scrims: [],
    tiers: [],
  });
  const [snapshots, setSnapshots] = useState<DailySnapshotRecord[]>([]);
  const [filters, setFilters] = useState<{
    mergeId: string | null;
    scrimId: string | null;
    sortBy: LeaderboardSortBy;
    tierId: string | null;
    week: string | null;
  }>({
    mergeId: null,
    scrimId: null,
    sortBy: "totalPoints",
    tierId: null,
    week: null,
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availableTiers = useMemo(
    () => scrimState.tiers.filter((tier) => !filters.scrimId || tier.scrimId === filters.scrimId),
    [filters.scrimId, scrimState.tiers],
  );

  const availablePresets = useMemo(
    () => scrimState.mergePresets.filter((preset) => !filters.scrimId || preset.scrimId === filters.scrimId),
    [filters.scrimId, scrimState.mergePresets],
  );

  async function loadBaseData() {
    const [nextScrimState, nextSnapshots] = await Promise.all([fetchScrimsState(), fetchDailySnapshots()]);
    setScrimState(nextScrimState);
    setSnapshots(nextSnapshots.snapshots);
  }

  async function loadLeaderboard(nextFilters = filters) {
    const nextLeaderboard = await fetchWeeklyLeaderboard(nextFilters);
    setLeaderboard(nextLeaderboard);
    setFilters((current) => ({
      ...current,
      ...nextLeaderboard.filters,
    }));
  }

  async function loadPage() {
    setError(null);

    try {
      await loadBaseData();
      await loadLeaderboard();
    } catch (nextError) {
      setError(formatTournamentsError(nextError));
    }
  }

  useEffect(() => {
    void loadPage();
  }, []);

  useEffect(() => {
    if (!availablePresets.some((preset) => preset.id === filters.mergeId)) {
      setFilters((current) => ({
        ...current,
        mergeId: null,
      }));
    }
  }, [availablePresets, filters.mergeId]);

  useEffect(() => {
    if (!availableTiers.some((tier) => tier.id === filters.tierId)) {
      setFilters((current) => ({
        ...current,
        tierId: null,
      }));
    }
  }, [availableTiers, filters.tierId]);

  useEffect(() => {
    if (!leaderboard) {
      return;
    }

    void loadLeaderboard(filters).catch((nextError) => {
      setError(formatTournamentsError(nextError));
    });
  }, [filters.mergeId, filters.scrimId, filters.sortBy, filters.tierId, filters.week]);

  async function handlePinFeatured() {
    if (!leaderboard) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      await updateFeaturedLeaderboard({
        mergeId: filters.mergeId,
        scrimId: filters.scrimId,
        sortBy: filters.sortBy,
        tierId: filters.tierId,
        title: leaderboard.title,
        week: filters.week,
      });
      setStatusMessage("Featured leaderboard updated for the public login page.");
      await loadLeaderboard(filters);
    } catch (nextError) {
      setError(formatTournamentsError(nextError));
    }
  }

  return (
    <section className="space-y-5">
      <Panel className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Archives</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-white">Weekly Leaderboards</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Weekly standings are generated from immutable daily snapshots, favorite merges, and auto-merge archives so published leaderboard views stay consistent after live lobbies reset.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="sm:w-auto" onClick={() => void loadPage()} variant="secondary">
              <RefreshCcw className="mr-2 size-4" />
              Refresh
            </Button>
            {leaderboard ? (
              <Button className="sm:w-auto" onClick={() => void exportLeaderboard(leaderboard.title, leaderboard)}>
                Export Excel
              </Button>
            ) : null}
            {isAdmin && leaderboard ? (
              <Button className="sm:w-auto" onClick={() => void handlePinFeatured()} variant="secondary">
                <Pin className="mr-2 size-4" />
                Pin Public Board
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Tracked Weeks</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{leaderboard?.availableWeeks.length ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Snapshots Used</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{leaderboard?.snapshotCount ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Ranked Teams</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{leaderboard?.entries.length ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Featured Public Board</p>
            <p className="mt-3 text-sm text-slate-200">
              {leaderboard?.featuredConfig?.title ?? "Not pinned yet"}
            </p>
          </div>
        </div>

        {statusMessage ? (
          <div className="mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            {statusMessage}
          </div>
        ) : null}
        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </Panel>

      <Panel className="p-5 sm:p-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Select onChange={(event) => setFilters((current) => ({ ...current, week: event.target.value || null }))} value={filters.week ?? ""}>
            <option className="bg-slate-950" value="">
              Latest week
            </option>
            {leaderboard?.availableWeeks.map((week) => (
              <option className="bg-slate-950" key={week} value={week}>
                {week}
              </option>
            ))}
          </Select>

          <Select onChange={(event) => setFilters((current) => ({ ...current, scrimId: event.target.value || null }))} value={filters.scrimId ?? ""}>
            <option className="bg-slate-950" value="">
              All scrims
            </option>
            {scrimState.scrims.map((scrim) => (
              <option className="bg-slate-950" key={scrim.id} value={scrim.id}>
                {scrim.name}
              </option>
            ))}
          </Select>

          <Select onChange={(event) => setFilters((current) => ({ ...current, tierId: event.target.value || null }))} value={filters.tierId ?? ""}>
            <option className="bg-slate-950" value="">
              All tiers
            </option>
            {availableTiers.map((tier) => (
              <option className="bg-slate-950" key={tier.id} value={tier.id}>
                {tier.name}
              </option>
            ))}
          </Select>

          <Select onChange={(event) => setFilters((current) => ({ ...current, mergeId: event.target.value || null }))} value={filters.mergeId ?? ""}>
            <option className="bg-slate-950" value="">
              All merge presets
            </option>
            {availablePresets.map((preset) => (
              <option className="bg-slate-950" key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </Select>

          <Select
            onChange={(event) =>
              setFilters((current) => ({ ...current, sortBy: event.target.value as LeaderboardSortBy }))
            }
            value={filters.sortBy}
          >
            <option className="bg-slate-950" value="totalPoints">
              Sort: Total Points
            </option>
            <option className="bg-slate-950" value="chickenDinners">
              Sort: Chicken Dinner
            </option>
            <option className="bg-slate-950" value="kills">
              Sort: Kills
            </option>
            <option className="bg-slate-950" value="matchesPlayed">
              Sort: Matches Played
            </option>
          </Select>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Weekly Standings</p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">
                {leaderboard?.title ?? "Weekly Leaderboard"}
              </p>
            </div>

            {leaderboard?.entries.length ? (
              leaderboard.entries.map((entry) => (
                <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={entry.teamName}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">
                        #{entry.rank} {entry.teamName}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        {entry.totalPoints} pts / {entry.kills} kills / {entry.chickenDinners} chicken dinners
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {entry.matchesPlayed} matches
                      </p>
                    </div>
                    <p className="font-display text-2xl font-semibold text-cyan-100">{entry.totalPoints}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                No leaderboard entries match the selected filters.
              </div>
            )}
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white">Recent Snapshot Timeline</p>
            {snapshots.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                No tournament archives exist yet.
              </div>
            ) : (
              snapshots.slice(0, 8).map((snapshot) => (
                <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={snapshot.id}>
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
                      <CalendarDays className="size-5" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-white">
                        {snapshot.dayName} ({snapshot.date})
                      </p>
                      <p className="text-sm text-slate-300">
                        {scrimState.scrims.find((scrim) => scrim.id === snapshot.scrimId)?.name ?? snapshot.scrimId}
                      </p>
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
      </div>
    </section>
  );
}
