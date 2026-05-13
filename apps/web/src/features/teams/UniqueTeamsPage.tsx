import { useEffect, useState } from "react";

import { FileSpreadsheet, RefreshCcw, ShieldCheck, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError } from "@/lib/http-client";

import {
  fetchTeams,
  importTeams,
  type TeamImportResult,
  type TeamRecord,
} from "./api/teams-client";

function formatImportError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to complete the team import.";
}

async function exportTeamsWorkbook(teams: TeamRecord[], report: TeamImportResult | null) {
  const xlsx = await import("xlsx");
  const workbook = xlsx.utils.book_new();

  xlsx.utils.book_append_sheet(
    workbook,
    xlsx.utils.json_to_sheet(
      teams.map((team) => ({
        "Display Name": team.displayName,
        "Normalized Name": team.normalizedName,
        "Created At": team.createdAt,
      })),
    ),
    "Unique Teams",
  );

  if (report) {
    xlsx.utils.book_append_sheet(
      workbook,
      xlsx.utils.json_to_sheet(
        report.duplicates.map((entry) => ({
          "Line Number": entry.lineNumber,
          "Slot Number": entry.slotNumber,
          "Display Name": entry.displayName,
          "Normalized Name": entry.normalizedName,
          Reason: entry.reason,
          "Original Line": entry.originalLine,
        })),
      ),
      "Duplicates",
    );

    xlsx.utils.book_append_sheet(
      workbook,
      xlsx.utils.json_to_sheet(
        report.invalidLines.map((entry) => ({
          "Line Number": entry.lineNumber,
          Reason: entry.reason,
          "Original Line": entry.originalLine,
        })),
      ),
      "Invalid Lines",
    );
  }

  xlsx.writeFile(workbook, "aslaaa-unique-teams.xlsx");
}

export function UniqueTeamsPage() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [rawInput, setRawInput] = useState("");
  const [report, setReport] = useState<TeamImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadTeams() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchTeams();
      setTeams(response.teams);
    } catch (nextError) {
      setError(formatImportError(nextError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTeams();
  }, []);

  async function handleImport() {
    setIsSubmitting(true);
    setStatus(null);
    setError(null);

    try {
      const nextReport = await importTeams(rawInput);
      setReport(nextReport);
      setStatus(
        `Imported ${nextReport.addedCount} teams. ${nextReport.duplicateCount} duplicates and ${nextReport.invalidCount} malformed lines were rejected.`,
      );
      setRawInput("");
      await loadTeams();
    } catch (nextError) {
      setError(formatImportError(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <Panel className="p-5 sm:p-6">
        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Admin Utility</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-white">Unique Team Registry</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">
              Import strict slot lists, normalize team names, reject malformed lines, and maintain a clean global registry for merges and exports.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Registered Teams</p>
              <p className="mt-3 font-display text-3xl font-semibold text-white">{teams.length}</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Last Added</p>
              <p className="mt-3 text-sm text-slate-200">
                {teams[0] ? new Date(teams[0].createdAt).toLocaleString() : "No imports yet"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Parser Mode</p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
                <ShieldCheck className="size-4" />
                Strict Slot Validation
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Import Slot List</p>
              <Button className="w-auto" onClick={() => void loadTeams()} variant="secondary">
                <RefreshCcw className="mr-2 size-4" />
                Refresh
              </Button>
            </div>
            <Textarea
              className="min-h-[260px]"
              onChange={(event) => setRawInput(event.target.value)}
              placeholder={"slot 1 -> Team Alpha\nslot 2 -> Team Bravo\nslot 3 -> Team Charlie"}
              value={rawInput}
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="sm:w-auto"
                disabled={isSubmitting || rawInput.trim().length === 0}
                onClick={() => void handleImport()}
              >
                <UploadCloud className="mr-2 size-4" />
                {isSubmitting ? "Importing..." : "Import Teams"}
              </Button>
              <Button
                className="sm:w-auto"
                disabled={teams.length === 0}
                onClick={() => void exportTeamsWorkbook(teams, report)}
                variant="secondary"
              >
                <FileSpreadsheet className="mr-2 size-4" />
                Export Excel
              </Button>
            </div>
            <p className="text-xs leading-5 text-slate-500">
              Accepted format: <span className="text-slate-300">slot 1 - Team Name</span>, <span className="text-slate-300">slot 2: Team Name</span>, or <span className="text-slate-300">slot 3 -&gt; Team Name</span>.
            </p>
            {status ? (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
                {status}
              </div>
            ) : null}
            {error ? (
              <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
          </div>

          {report ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
                <p className="text-sm font-semibold text-white">Import Report</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-300">
                  <p>Parsed valid lines: {report.parsedCount}</p>
                  <p>Added teams: {report.addedCount}</p>
                  <p>Duplicate lines: {report.duplicateCount}</p>
                  <p>Malformed lines: {report.invalidCount}</p>
                </div>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
                <p className="text-sm font-semibold text-white">Malformed Lines</p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  {report.invalidLines.length === 0 ? (
                    <p className="text-slate-500">No malformed lines in the last import.</p>
                  ) : (
                    report.invalidLines.slice(0, 6).map((entry) => (
                      <p key={`${entry.lineNumber}-${entry.reason}`}>
                        Line {entry.lineNumber}: {entry.reason} - {entry.originalLine}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel className="p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Registry</p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">Normalized Team List</p>
            </div>
            {isLoading ? <p className="text-sm text-slate-500">Loading…</p> : null}
          </div>

          <div className="max-h-[640px] space-y-3 overflow-y-auto pr-1">
            {teams.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                No teams have been imported yet.
              </div>
            ) : (
              teams.map((team) => (
                <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={team.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{team.displayName}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {team.normalizedName}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">{new Date(team.createdAt).toLocaleDateString()}</p>
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
