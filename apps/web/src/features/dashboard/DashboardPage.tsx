import { useEffect, useState } from "react";

import { Activity, Crown, FileStack, Flag, Layers3, TimerReset, Trophy, Users } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { fetchActivityLogs, type ActivityLogRecord } from "@/features/activity/api/activity-client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchAchievements } from "@/features/achievements/api/achievements-client";
import {
  fetchAutoMergeRuns,
  fetchDailySnapshots,
} from "@/features/settings/api/settings-client";
import { fetchScrimsState } from "@/features/scrims/api/scrims-client";
import { fetchSuggestions } from "@/features/suggestions/api/suggestions-client";
import { fetchTeams } from "@/features/teams/api/teams-client";
import { fetchUsers } from "@/features/users/api/users-client";
import { ApiClientError } from "@/lib/http-client";

type DashboardSummary = {
  achievements: number;
  entries: number;
  lobbies: number;
  mergePresets: number;
  runs: number;
  scrims: number;
  snapshots: number;
  suggestions: number;
  teams: number;
  users: number;
};

function formatDashboardError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load the dashboard summary.";
}

export function DashboardPage() {
  const { session } = useAuth();
  const isAdmin = session?.user.role === "ADMIN";
  const [summary, setSummary] = useState<DashboardSummary>({
    achievements: 0,
    entries: 0,
    lobbies: 0,
    mergePresets: 0,
    runs: 0,
    scrims: 0,
    snapshots: 0,
    suggestions: 0,
    teams: 0,
    users: 0,
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      try {
        const [teams, suggestions, achievements, snapshots, scrimsState, users, runs, activity] = await Promise.all([
          isAdmin ? fetchTeams() : Promise.resolve({ teams: [] }),
          fetchSuggestions(),
          fetchAchievements(),
          fetchDailySnapshots(),
          fetchScrimsState(),
          isAdmin ? fetchUsers() : Promise.resolve({ users: [] }),
          isAdmin ? fetchAutoMergeRuns() : Promise.resolve({ runs: [] }),
          fetchActivityLogs(isAdmin ? 14 : 8),
        ]);

        if (!isMounted) {
          return;
        }

        setSummary({
          achievements: achievements.achievements.length,
          entries: scrimsState.lobbyEntries.length,
          lobbies: scrimsState.lobbies.length,
          mergePresets: scrimsState.mergePresets.length,
          runs: runs.runs.length,
          scrims: scrimsState.scrims.length,
          snapshots: snapshots.snapshots.length,
          suggestions: suggestions.suggestions.length,
          teams: teams.teams.length,
          users: users.users.length,
        });
        setActivityLogs(activity.logs);
      } catch (nextError) {
        if (isMounted) {
          setError(formatDashboardError(nextError));
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAdmin]);

  const cards = [
    { icon: Layers3, label: "Scrims", value: summary.scrims },
    { icon: Crown, label: "Lobbies", value: summary.lobbies },
    { icon: Trophy, label: "Merge Presets", value: summary.mergePresets },
    { icon: Activity, label: "Live Entries", value: summary.entries },
    { icon: FileStack, label: "Snapshots", value: summary.snapshots },
    { icon: TimerReset, label: "Automation Runs", value: summary.runs },
    { icon: Flag, label: "Achievements", value: summary.achievements },
    { icon: Users, label: isAdmin ? "Users" : "Suggestions", value: isAdmin ? summary.users : summary.suggestions },
  ];

  return (
    <section className="space-y-5">
      <Panel className="p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Overview</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">Operations Dashboard</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Live operational summary across scrim structure, scoring activity, merges, automation, archives, and the latest logged platform actions.
        </p>
        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ icon: Icon, label, value }) => (
          <Panel className="p-5" key={label}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{label}</p>
                <p className="mt-3 font-display text-4xl font-semibold text-white">{value}</p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
                <Icon className="size-5" />
              </div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white">Recent Activity</p>
            {activityLogs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                No activity has been logged yet.
              </div>
            ) : (
              activityLogs.map((log) => (
                <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={log.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{log.description}</p>
                      <p className="mt-2 text-sm text-slate-300">
                        {log.module} / {log.action}
                      </p>
                    </div>
                    <div className="text-right text-xs uppercase tracking-[0.18em] text-slate-500">
                      <p>{log.actorUsername ?? "SYSTEM"}</p>
                      <p>{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white">Access Snapshot</p>
            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Signed in as</p>
              <p className="mt-3 font-display text-2xl font-semibold text-white">{session?.user.username}</p>
              <p className="mt-2 text-sm text-slate-300">{session?.user.role === "ADMIN" ? "Administrator" : "PT Maker"}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Accessible routes</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{session?.accessibleRoutes.join(", ")}</p>
            </div>
            {isAdmin ? (
              <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Admin datasets</p>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Unique teams: {summary.teams} / users: {summary.users} / suggestions: {summary.suggestions}
                </p>
              </div>
            ) : null}
          </div>
        </Panel>
      </div>
    </section>
  );
}
