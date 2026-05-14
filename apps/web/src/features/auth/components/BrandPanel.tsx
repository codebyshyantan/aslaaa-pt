import { useEffect, useState } from "react";

import { Activity, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { motion } from "framer-motion";

import { Panel } from "@/components/ui/panel";
import { fetchFeaturedLeaderboardOverview, type PublicLeaderboardOverview } from "@/features/tournaments/api/leaderboards-client";

import { appName } from "../auth.types";

const highlights = [
  {
    title: "Operational Control",
    description:
      "Protected internal workspace for scrims, merges, automation, archives, exports, and team operations.",
    icon: ShieldCheck,
  },
  {
    title: "Shared State Safety",
    description:
      "Conflict-safe lobby autosave, stale-state detection, and last-editor visibility support simultaneous PT operations.",
    icon: Activity,
  },
  {
    title: "Weekly Visibility",
    description:
      "Featured weekly leaderboards and recent archive highlights are published directly from immutable snapshot data.",
    icon: Sparkles,
  },
];

export function BrandPanel() {
  const [overview, setOverview] = useState<PublicLeaderboardOverview | null>(null);

  useEffect(() => {
    void fetchFeaturedLeaderboardOverview().then(setOverview).catch(() => {
      setOverview(null);
    });
  }, []);

  return (
    <motion.section
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(51,181,255,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(136,242,216,0.16),transparent_32%),rgba(8,11,21,0.88)] p-6 shadow-[0_32px_120px_rgba(8,14,24,0.48)] backdrop-blur-2xl sm:p-8 lg:min-h-[700px] lg:p-10"
      initial={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.55, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_26%,transparent_72%,rgba(255,255,255,0.04))]" />

      <div className="relative flex h-full flex-col justify-between gap-8">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/90">
            <Trophy className="size-4 text-cyan-200" />
            ASLAAA ESPORTS
          </div>

          <div className="space-y-4">
            <p className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              {appName}
            </p>
            <p className="max-w-xl text-sm leading-7 text-slate-300 sm:text-base">
              Private esports operations workspace for secure access, concurrent scoring, weekly leaderboard publishing, automation resets, and export-ready reporting.
            </p>
          </div>

          <div className="grid gap-4">
            {highlights.map(({ description, icon: Icon, title }) => (
              <Panel className="bg-black/18 p-4 sm:p-5" key={title}>
                <div className="flex items-start gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-display text-lg font-medium text-white">{title}</p>
                    <p className="text-sm leading-6 text-slate-300">{description}</p>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <Panel className="bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              {overview?.featured?.title ?? "Featured Weekly Leaderboard"}
            </p>
            <div className="mt-4 space-y-3">
              {overview?.featured?.entries.length ? (
                overview.featured.entries.slice(0, 5).map((entry) => (
                  <div className="flex items-center justify-between gap-4 text-sm text-slate-200" key={entry.teamName}>
                    <span>
                      #{entry.rank} {entry.teamName}
                    </span>
                    <span>{entry.totalPoints} pts</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Featured leaderboard will appear after the first archived weekly snapshot.</p>
              )}
            </div>
          </Panel>

          <Panel className="bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Recent Scrim Highlights</p>
            <div className="mt-4 space-y-3">
              {overview?.recentHighlights.length ? (
                overview.recentHighlights.map((highlight) => (
                  <div className="rounded-2xl border border-white/8 bg-white/5 p-3" key={highlight.id}>
                    <p className="text-sm font-semibold text-white">
                      {highlight.scrimName} / {highlight.dayName}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">{highlight.date}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      {highlight.topTeams.map((team) => `${team.teamName} (${team.totalPoints})`).join(", ")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">Recent archive highlights will appear here once snapshots are available.</p>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </motion.section>
  );
}
