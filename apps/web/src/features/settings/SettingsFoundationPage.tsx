import { useEffect, useMemo, useState } from "react";

import { Play, RefreshCcw, Save, Settings2, TimerReset } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { ApiClientError } from "@/lib/http-client";

import { fetchScrimsState } from "@/features/scrims/api/scrims-client";

import {
  createAutoMergeConfig,
  executeAutoMergeConfig,
  fetchAutoMergeConfigs,
  fetchAutoMergeRuns,
  fetchDailySnapshots,
  fetchExecutionPlan,
  fetchPointSystemSettings,
  updatePointSystemSettings,
  type AutoMergeConfigRecord,
  type AutoMergeExecutionPlan,
  type AutomationRunRecord,
  type DailySnapshotRecord,
} from "./api/settings-client";

function formatSettingsError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load settings data.";
}

export function SettingsFoundationPage() {
  const [configs, setConfigs] = useState<AutoMergeConfigRecord[]>([]);
  const [runs, setRuns] = useState<AutomationRunRecord[]>([]);
  const [snapshots, setSnapshots] = useState<DailySnapshotRecord[]>([]);
  const [plans, setPlans] = useState<Record<string, AutoMergeExecutionPlan>>({});
  const [scrimState, setScrimState] = useState<Awaited<ReturnType<typeof fetchScrimsState>>>({
    groups: [],
    lobbies: [],
    lobbyEntries: [],
    mergePresets: [],
    scrims: [],
    tiers: [],
  });
  const [killPointValue, setKillPointValue] = useState(1);
  const [positionPoints, setPositionPoints] = useState<number[]>([]);
  const [configForm, setConfigForm] = useState({
    enabled: true,
    favoriteMergeId: "",
    resetTime: "05:00",
    scrimId: "",
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const availablePresets = useMemo(
    () => scrimState.mergePresets.filter((preset) => preset.scrimId === configForm.scrimId),
    [configForm.scrimId, scrimState.mergePresets],
  );

  async function loadState() {
    setError(null);

    try {
      const [configsResponse, runsResponse, snapshotsResponse, scrimsResponse, pointSystem] = await Promise.all([
        fetchAutoMergeConfigs(),
        fetchAutoMergeRuns(),
        fetchDailySnapshots(),
        fetchScrimsState(),
        fetchPointSystemSettings(),
      ]);

      setConfigs(configsResponse.configs);
      setRuns(runsResponse.runs);
      setSnapshots(snapshotsResponse.snapshots);
      setScrimState(scrimsResponse);
      setKillPointValue(pointSystem.killPointValue);
      setPositionPoints(pointSystem.positionPoints);

      setConfigForm((current) => ({
        ...current,
        favoriteMergeId:
          scrimsResponse.mergePresets.find((preset) => preset.id === current.favoriteMergeId)?.id ??
          scrimsResponse.mergePresets.find((preset) => preset.scrimId === current.scrimId)?.id ??
          scrimsResponse.mergePresets[0]?.id ??
          "",
        scrimId: scrimsResponse.scrims.find((scrim) => scrim.id === current.scrimId)?.id ?? scrimsResponse.scrims[0]?.id ?? "",
      }));
    } catch (nextError) {
      setError(formatSettingsError(nextError));
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  useEffect(() => {
    if (!availablePresets.some((preset) => preset.id === configForm.favoriteMergeId)) {
      setConfigForm((current) => ({
        ...current,
        favoriteMergeId: availablePresets[0]?.id ?? "",
      }));
    }
  }, [availablePresets, configForm.favoriteMergeId]);

  async function handleCreateConfig() {
    setError(null);
    setStatusMessage(null);

    try {
      const config = await createAutoMergeConfig(configForm);
      setStatusMessage(`Automation config saved for scrim ${config.scrimId}.`);
      await loadState();
    } catch (nextError) {
      setError(formatSettingsError(nextError));
    }
  }

  async function handleSavePointSystem() {
    setError(null);
    setStatusMessage(null);

    try {
      const nextSettings = await updatePointSystemSettings({
        killPointValue,
        positionPoints,
      });
      setKillPointValue(nextSettings.killPointValue);
      setPositionPoints(nextSettings.positionPoints);
      setStatusMessage("Point system updated.");
    } catch (nextError) {
      setError(formatSettingsError(nextError));
    }
  }

  async function handleLoadPlan(configId: string) {
    setError(null);

    try {
      const plan = await fetchExecutionPlan(configId);
      setPlans((current) => ({
        ...current,
        [configId]: plan,
      }));
    } catch (nextError) {
      setError(formatSettingsError(nextError));
    }
  }

  async function handleRunConfig(configId: string) {
    setError(null);
    setStatusMessage(null);

    try {
      const result = await executeAutoMergeConfig(configId);
      setStatusMessage(
        result.snapshot
          ? `Reset completed. Snapshot ${result.snapshot.date} archived and lobby data cleared.`
          : `Reset skipped with status ${result.run.status.toLowerCase()}.`,
      );
      await loadState();
    } catch (nextError) {
      setError(formatSettingsError(nextError));
    }
  }

  return (
    <section className="space-y-5">
      <Panel className="p-5 sm:p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Control Center</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-white">Settings & Automation</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Tune global scoring, connect favorite merges to reset schedules, execute archive cycles, and monitor operational history.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Configs</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{configs.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Runs</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{runs.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Snapshots</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{snapshots.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Kill Value</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{killPointValue}</p>
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

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings2 className="size-5 text-cyan-100" />
              <p className="text-sm font-semibold text-white">Point System</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Input onChange={(event) => setKillPointValue(Number(event.target.value) || 0)} type="number" value={killPointValue} />
              {positionPoints.slice(0, 11).map((points, index) => (
                <Input
                  key={index}
                  onChange={(event) =>
                    setPositionPoints((current) =>
                      current.map((entry, entryIndex) => (entryIndex === index ? Number(event.target.value) || 0 : entry)),
                    )
                  }
                  placeholder={`Pos ${index + 1}`}
                  type="number"
                  value={points}
                />
              ))}
            </div>

            <Button className="sm:w-auto" onClick={() => void handleSavePointSystem()}>
              <Save className="mr-2 size-4" />
              Save Point Rules
            </Button>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TimerReset className="size-5 text-cyan-100" />
              <p className="text-sm font-semibold text-white">Auto Merge Config</p>
            </div>

            <Select onChange={(event) => setConfigForm((current) => ({ ...current, scrimId: event.target.value }))} value={configForm.scrimId}>
              <option className="bg-slate-950" value="">
                Select scrim
              </option>
              {scrimState.scrims.map((scrim) => (
                <option className="bg-slate-950" key={scrim.id} value={scrim.id}>
                  {scrim.name}
                </option>
              ))}
            </Select>

            <Select
              onChange={(event) => setConfigForm((current) => ({ ...current, favoriteMergeId: event.target.value }))}
              value={configForm.favoriteMergeId}
            >
              <option className="bg-slate-950" value="">
                Select favorite merge
              </option>
              {availablePresets.map((preset) => (
                <option className="bg-slate-950" key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </Select>

            <Input
              onChange={(event) => setConfigForm((current) => ({ ...current, resetTime: event.target.value }))}
              placeholder="HH:MM"
              value={configForm.resetTime}
            />

            <label className="inline-flex items-center gap-3 text-sm text-slate-300">
              <input
                checked={configForm.enabled}
                onChange={(event) => setConfigForm((current) => ({ ...current, enabled: event.target.checked }))}
                type="checkbox"
              />
              Enabled for scheduled reset
            </label>

            <Button
              className="sm:w-auto"
              disabled={!configForm.scrimId || !configForm.favoriteMergeId || configForm.resetTime.length !== 5}
              onClick={() => void handleCreateConfig()}
              variant="secondary"
            >
              <Save className="mr-2 size-4" />
              Save Automation Config
            </Button>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <p className="text-sm font-semibold text-white">Configured Resets</p>
            {configs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                No automation configs exist yet.
              </div>
            ) : (
              configs.map((config) => {
                const plan = plans[config.id];

                return (
                  <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={config.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <p className="font-semibold text-white">
                          {scrimState.scrims.find((scrim) => scrim.id === config.scrimId)?.name ?? config.scrimId}
                        </p>
                        <p className="text-sm text-slate-300">
                          Favorite merge:{" "}
                          {scrimState.mergePresets.find((preset) => preset.id === config.favoriteMergeId)?.name ?? config.favoriteMergeId}
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                          Reset time {config.resetTime} / {config.enabled ? "enabled" : "disabled"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button className="sm:w-auto" onClick={() => void handleLoadPlan(config.id)} variant="secondary">
                          View Plan
                        </Button>
                        <Button className="sm:w-auto" onClick={() => void handleRunConfig(config.id)}>
                          <Play className="mr-2 size-4" />
                          Run Now
                        </Button>
                      </div>
                    </div>
                    {plan ? (
                      <div className="mt-4 rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
                        {plan.resetArchitecture.map((step) => (
                          <p key={step.step}>
                            {step.step}. {step.title}: {step.detail}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">Run History</p>
              <Button className="sm:w-auto" onClick={() => void loadState()} variant="secondary">
                <RefreshCcw className="mr-2 size-4" />
                Refresh
              </Button>
            </div>
            {runs.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                No automation runs have been recorded yet.
              </div>
            ) : (
              runs.map((run) => (
                <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={run.id}>
                  <p className="font-semibold text-white">
                    {scrimState.scrims.find((scrim) => scrim.id === run.scrimId)?.name ?? run.scrimId}
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {run.status} / {run.detectedActiveRecords} active rows / snapshot {run.snapshotId ?? "none"}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {run.runDate} / {new Date(run.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}

            <div className="pt-3">
              <p className="text-sm font-semibold text-white">Recent Snapshots</p>
              <div className="mt-3 space-y-3">
                {snapshots.slice(0, 5).map((snapshot) => (
                  <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={snapshot.id}>
                    <p className="font-semibold text-white">
                      {snapshot.dayName} / {snapshot.date}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {scrimState.scrims.find((scrim) => scrim.id === snapshot.scrimId)?.name ?? snapshot.scrimId}
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                      Archived {new Date(snapshot.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </section>
  );
}
