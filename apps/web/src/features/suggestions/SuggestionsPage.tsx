import { useEffect, useState } from "react";

import { Lightbulb, Send, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ApiClientError } from "@/lib/http-client";

import {
  createSuggestion,
  fetchSuggestions,
  suggestionStatusOptions,
  updateSuggestionStatus,
  type SuggestionRecord,
  type SuggestionStatus,
} from "./api/suggestions-client";

function toneForStatus(status: SuggestionStatus) {
  switch (status) {
    case "IMPLEMENTED":
      return "border-emerald-300/20 bg-emerald-400/10 text-emerald-100";
    case "UNDER_REVIEW":
      return "border-cyan-300/20 bg-cyan-400/10 text-cyan-100";
    case "REJECTED":
      return "border-rose-300/20 bg-rose-400/10 text-rose-100";
    default:
      return "border-white/10 bg-white/5 text-slate-300";
  }
}

function formatSuggestionError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load the suggestions workflow.";
}

export function SuggestionsPage() {
  const { session } = useAuth();
  const [suggestions, setSuggestions] = useState<SuggestionRecord[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = session?.user.role === "ADMIN";

  async function loadSuggestions() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchSuggestions();
      setSuggestions(response.suggestions);
    } catch (nextError) {
      setError(formatSuggestionError(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadSuggestions();
  }, []);

  async function handleSubmit() {
    setIsSubmitting(true);
    setStatusMessage(null);
    setError(null);

    try {
      await createSuggestion({
        description,
        title,
      });
      setTitle("");
      setDescription("");
      setStatusMessage("Suggestion submitted successfully.");
      await loadSuggestions();
    } catch (nextError) {
      setError(formatSuggestionError(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(id: string, status: SuggestionStatus) {
    setError(null);

    try {
      await updateSuggestionStatus(id, status);
      await loadSuggestions();
    } catch (nextError) {
      setError(formatSuggestionError(nextError));
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel className="p-5 sm:p-6">
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Collaboration</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-white">Suggestions</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Capture ideas, bug reports, and workflow improvements from admins and PT makers in one moderated queue.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Total Suggestions</p>
              <p className="mt-3 font-display text-3xl font-semibold text-white">{suggestions.length}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Pending Review</p>
              <p className="mt-3 font-display text-3xl font-semibold text-white">
                {suggestions.filter((entry) => entry.status === "PENDING").length}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Implemented</p>
              <p className="mt-3 font-display text-3xl font-semibold text-white">
                {suggestions.filter((entry) => entry.status === "IMPLEMENTED").length}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Submit Suggestion</p>
            <Input onChange={(event) => setTitle(event.target.value)} placeholder="Short title" value={title} />
            <Textarea
              className="min-h-[220px]"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the idea, bug, or workflow improvement in detail."
              value={description}
            />
            <Button
              className="sm:w-auto"
              disabled={isSubmitting || title.trim().length < 3 || description.trim().length < 10}
              onClick={() => void handleSubmit()}
            >
              <Send className="mr-2 size-4" />
              {isSubmitting ? "Submitting..." : "Submit Suggestion"}
            </Button>
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
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Queue</p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">Review Workflow</p>
            </div>
            {isLoading ? <p className="text-sm text-slate-500">Loading…</p> : null}
          </div>

          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                No suggestions have been submitted yet.
              </div>
            ) : (
              suggestions.map((entry) => (
                <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={entry.id}>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Lightbulb className="size-4 text-cyan-100" />
                        <p className="font-semibold text-white">{entry.title}</p>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${toneForStatus(entry.status)}`}>
                          {entry.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm leading-7 text-slate-300">{entry.description}</p>
                      <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                        <span>{entry.submittedByUsername}</span>
                        <span>{entry.submittedByRole}</span>
                        <span>{new Date(entry.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                    {isAdmin ? (
                      <div className="sm:min-w-[220px]">
                        <Select
                          onChange={(event) =>
                            void handleStatusChange(entry.id, event.target.value as SuggestionStatus)
                          }
                          value={entry.status}
                        >
                          {suggestionStatusOptions.map((status) => (
                            <option className="bg-slate-950" key={status} value={status}>
                              {status.replaceAll("_", " ")}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                        <Sparkles className="size-3.5" />
                        Shared Queue
                      </div>
                    )}
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
