import { useEffect, useState } from "react";

import { Award, CalendarClock, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ApiClientError } from "@/lib/http-client";

import {
  createAchievement,
  fetchAchievements,
  type AchievementRecord,
} from "./api/achievements-client";

function formatAchievementError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load the achievements timeline.";
}

export function AchievementsPage() {
  const { session } = useAuth();
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = session?.user.role === "ADMIN";

  async function loadAchievements() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchAchievements();
      setAchievements(response.achievements);
    } catch (nextError) {
      setError(formatAchievementError(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAchievements();
  }, []);

  async function handleCreate() {
    setIsSubmitting(true);
    setStatusMessage(null);
    setError(null);

    try {
      await createAchievement({
        description,
        title,
      });
      setTitle("");
      setDescription("");
      setStatusMessage("Achievement recorded successfully.");
      await loadAchievements();
    } catch (nextError) {
      setError(formatAchievementError(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Panel className="p-5 sm:p-6">
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Timeline</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-white">Achievements</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Preserve key operational milestones in a readable history for ASLAAA PT. Admins can publish verified achievements for the wider team.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Timeline Entries</p>
              <p className="mt-3 font-display text-3xl font-semibold text-white">{achievements.length}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Latest Update</p>
              <p className="mt-3 text-sm text-slate-200">
                {achievements[0] ? new Date(achievements[0].createdAt).toLocaleString() : "No achievements yet"}
              </p>
            </div>
          </div>

          {isAdmin ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Record Achievement</p>
              <Input onChange={(event) => setTitle(event.target.value)} placeholder="Achievement title" value={title} />
              <Textarea
                className="min-h-[220px]"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Write the milestone, impact, and operational context."
                value={description}
              />
              <Button
                className="sm:w-auto"
                disabled={isSubmitting || title.trim().length < 3 || description.trim().length < 10}
                onClick={() => void handleCreate()}
              >
                <PlusCircle className="mr-2 size-4" />
                {isSubmitting ? "Publishing..." : "Publish Achievement"}
              </Button>
            </div>
          ) : (
            <div className="rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
              Achievements are published by administrators. PT makers can review the live timeline here.
            </div>
          )}

          {statusMessage ? (
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
              {statusMessage}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">History</p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">Achievement Timeline</p>
            </div>
            {isLoading ? <p className="text-sm text-slate-500">Loading…</p> : null}
          </div>

          <div className="space-y-3">
            {achievements.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                No achievements have been published yet.
              </div>
            ) : (
              achievements.map((entry) => (
                <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={entry.id}>
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
                      <Award className="size-5" />
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-white">{entry.title}</p>
                      <p className="text-sm leading-7 text-slate-300">{entry.description}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                        <span>{entry.createdByUsername}</span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="size-3.5" />
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Panel>
    </section>
  );
}
