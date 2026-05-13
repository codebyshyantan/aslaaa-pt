import { Activity, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { motion } from "framer-motion";

import { Panel } from "@/components/ui/panel";

import { appName } from "../auth.types";

const highlights = [
  {
    title: "Operational Control",
    description:
      "Protected internal workspace for scrims, merges, automation, archives, exports, and team operations.",
    icon: ShieldCheck,
  },
  {
    title: "Data Quality",
    description:
      "Unique team normalization, duplicate detection, and Excel-ready export flows built for clean competitive data.",
    icon: Activity,
  },
  {
    title: "Automation Ready",
    description:
      "Favorite-merge resets, immutable daily snapshots, live scoring rules, and activity logging are built into the platform workflow.",
    icon: Sparkles,
  },
];

const metrics = [
  { label: "Core roles", value: "2" },
  { label: "Admin utilities", value: "6" },
  { label: "Export mode", value: "Excel" },
];

export function BrandPanel() {
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
              Private esports operations workspace for authentication, protected modules, live point tables, automation resets, team management, and historical reporting.
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

        <div className="grid gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <Panel className="bg-black/18 p-4" key={metric.label}>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{metric.label}</p>
              <p className="mt-3 font-display text-3xl font-semibold text-white">{metric.value}</p>
            </Panel>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
