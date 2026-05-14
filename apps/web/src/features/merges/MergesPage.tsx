import { useEffect, useMemo, useState } from "react";

import { GitMerge, RefreshCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ApiClientError } from "@/lib/http-client";

import {
  createMergePreset,
  deleteMergePreset,
  fetchMergePresetStandings,
  fetchScrimsState,
  previewMerge,
  renameMergePreset,
  type MergePreviewResponse,
  type ScrimsState,
} from "@/features/scrims/api/scrims-client";

function formatMergeError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load merge data.";
}

export function MergesPage() {
  const { session } = useAuth();
  const isAdmin = session?.user.role === "ADMIN";
  const [state, setState] = useState<ScrimsState>({
    groups: [],
    lobbies: [],
    lobbyEntries: [],
    mergePresets: [],
    scrims: [],
    tiers: [],
  });
  const [selectedScrimId, setSelectedScrimId] = useState("");
  const [selectedLobbyIds, setSelectedLobbyIds] = useState<string[]>([]);
  const [mergeName, setMergeName] = useState("");
  const [markFavorite, setMarkFavorite] = useState(true);
  const [preview, setPreview] = useState<MergePreviewResponse | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedScrimTiers = useMemo(
    () => state.tiers.filter((tier) => tier.scrimId === selectedScrimId),
    [selectedScrimId, state.tiers],
  );

  const selectedTierIds = useMemo(
    () => new Set(selectedScrimTiers.map((tier) => tier.id)),
    [selectedScrimTiers],
  );

  const selectedScrimGroups = useMemo(
    () => state.groups.filter((group) => selectedTierIds.has(group.tierId)),
    [selectedTierIds, state.groups],
  );

  const selectedGroupIds = useMemo(
    () => new Set(selectedScrimGroups.map((group) => group.id)),
    [selectedScrimGroups],
  );

  const selectedScrimLobbies = useMemo(
    () => state.lobbies.filter((lobby) => selectedGroupIds.has(lobby.groupId)),
    [selectedGroupIds, state.lobbies],
  );

  const selectedScrimPresets = useMemo(
    () => state.mergePresets.filter((preset) => preset.scrimId === selectedScrimId),
    [selectedScrimId, state.mergePresets],
  );

  async function loadState() {
    setError(null);

    try {
      const nextState = await fetchScrimsState();
      setState(nextState);
      setSelectedScrimId((current) => nextState.scrims.find((scrim) => scrim.id === current)?.id ?? nextState.scrims[0]?.id ?? "");
    } catch (nextError) {
      setError(formatMergeError(nextError));
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  useEffect(() => {
    setSelectedLobbyIds((current) => current.filter((lobbyId) => selectedScrimLobbies.some((lobby) => lobby.id === lobbyId)));
  }, [selectedScrimLobbies]);

  async function handlePreview() {
    if (selectedLobbyIds.length === 0) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      setPreview(await previewMerge(selectedLobbyIds));
    } catch (nextError) {
      setError(formatMergeError(nextError));
    }
  }

  async function handleLoadPreset(presetId: string) {
    setError(null);
    setStatusMessage(null);

    try {
      const nextPreview = await fetchMergePresetStandings(presetId);
      setSelectedLobbyIds(nextPreview.preset?.lobbyIds ?? []);
      setPreview(nextPreview);
    } catch (nextError) {
      setError(formatMergeError(nextError));
    }
  }

  async function handleSavePreset() {
    if (!selectedScrimId || selectedLobbyIds.length === 0) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      const preset = await createMergePreset({
        isFavorite: markFavorite,
        lobbyIds: selectedLobbyIds,
        name: mergeName,
        scrimId: selectedScrimId,
      });
      setMergeName("");
      setStatusMessage(`Merge preset ${preset.name} saved.`);
      await loadState();
      await handleLoadPreset(preset.id);
    } catch (nextError) {
      setError(formatMergeError(nextError));
    }
  }

  async function handleRenamePreset(presetId: string, currentName: string) {
    const nextName = window.prompt("Rename merge preset", currentName);

    if (!nextName?.trim()) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      const preset = await renameMergePreset(presetId, nextName.trim());
      setStatusMessage(`Merge preset renamed to ${preset.name}.`);
      await loadState();
      await handleLoadPreset(preset.id);
    } catch (nextError) {
      setError(formatMergeError(nextError));
    }
  }

  async function handleDeletePreset(presetId: string, presetName: string) {
    const confirmed = window.confirm(
      `Delete merge preset ${presetName}? This may also remove linked auto-merge configs and archived snapshots that depend on the preset.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      await deleteMergePreset(presetId);
      setPreview(null);
      setSelectedLobbyIds([]);
      setStatusMessage(`Merge preset ${presetName} deleted.`);
      await loadState();
    } catch (nextError) {
      setError(formatMergeError(nextError));
    }
  }

  function toggleLobbySelection(lobbyId: string) {
    setSelectedLobbyIds((current) =>
      current.includes(lobbyId) ? current.filter((entry) => entry !== lobbyId) : [...current, lobbyId],
    );
  }

  return (
    <section className="space-y-5">
      <Panel className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Merge Engine</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-white">Custom & Favorite Merges</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Select any live lobby set for an on-demand merged table, or persist a favorite preset for recurring automation and archive workflows.
            </p>
          </div>
          <Button className="sm:w-auto" onClick={() => void loadState()} variant="secondary">
            <RefreshCcw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Available Presets</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{selectedScrimPresets.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Selected Lobbies</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{selectedLobbyIds.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Merged Teams</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{preview?.standings.length ?? 0}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Point Rule</p>
            <p className="mt-3 text-sm text-slate-200">
              {preview ? `Kills x ${preview.pointSystem.killPointValue}` : "Load a preview"}
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

      <div className="grid gap-5 xl:grid-cols-[0.96fr_1.04fr]">
        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Lobby Picker</p>
                <p className="mt-2 font-display text-2xl font-semibold text-white">Compose A Merge</p>
              </div>
              <Select onChange={(event) => setSelectedScrimId(event.target.value)} value={selectedScrimId}>
                <option className="bg-slate-950" value="">
                  Select scrim
                </option>
                {state.scrims.map((scrim) => (
                  <option className="bg-slate-950" key={scrim.id} value={scrim.id}>
                    {scrim.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-3">
              {selectedScrimTiers.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                  No lobbies are available for the selected scrim yet.
                </div>
              ) : (
                selectedScrimTiers.map((tier) => {
                  const tierGroups = selectedScrimGroups.filter((group) => group.tierId === tier.id);
                  return (
                    <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={tier.id}>
                      <p className="font-semibold text-white">{tier.name}</p>
                      <div className="mt-3 space-y-3">
                        {tierGroups.map((group) => (
                          <div className="rounded-2xl border border-white/8 bg-white/5 p-3" key={group.id}>
                            <p className="text-sm font-semibold text-slate-100">{group.name}</p>
                            <div className="mt-3 space-y-2">
                              {selectedScrimLobbies
                                .filter((lobby) => lobby.groupId === group.id)
                                .map((lobby) => (
                                  <label className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-3 py-2 text-sm text-slate-200" key={lobby.id}>
                                    <span>{lobby.name}</span>
                                    <input
                                      checked={selectedLobbyIds.includes(lobby.id)}
                                      onChange={() => toggleLobbySelection(lobby.id)}
                                      type="checkbox"
                                    />
                                  </label>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="sm:w-auto" disabled={selectedLobbyIds.length === 0} onClick={() => void handlePreview()}>
                <GitMerge className="mr-2 size-4" />
                Preview Merge
              </Button>
              {isAdmin ? (
                <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                  <Input onChange={(event) => setMergeName(event.target.value)} placeholder="Preset name" value={mergeName} />
                  <label className="inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
                    <input checked={markFavorite} onChange={(event) => setMarkFavorite(event.target.checked)} type="checkbox" />
                    Favorite preset
                  </label>
                  <Button
                    className="sm:w-auto"
                    disabled={mergeName.trim().length < 3 || selectedLobbyIds.length === 0}
                    onClick={() => void handleSavePreset()}
                    variant="secondary"
                  >
                    <Save className="mr-2 size-4" />
                    Save Preset
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Standings</p>
              <p className="mt-2 font-display text-2xl font-semibold text-white">
                {preview?.preset ? preview.preset.name : "Custom Merge Preview"}
              </p>
            </div>

            {selectedScrimPresets.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedScrimPresets.map((preset) => (
                  <div className="flex items-center gap-2" key={preset.id}>
                    <button
                      className={
                        preset.isFavorite
                          ? "rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100"
                          : "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"
                      }
                      onClick={() => void handleLoadPreset(preset.id)}
                      type="button"
                    >
                      {preset.name}
                    </button>
                    {isAdmin ? (
                      <>
                        <Button className="sm:w-auto" onClick={() => void handleRenamePreset(preset.id, preset.name)} variant="secondary">
                          Rename
                        </Button>
                        <Button className="sm:w-auto" onClick={() => void handleDeletePreset(preset.id, preset.name)} variant="secondary">
                          Delete
                        </Button>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}

            {preview ? (
              <>
                <div className="rounded-3xl border border-white/10 bg-black/18 p-4 text-sm text-slate-300">
                  <p>
                    Lobbies included: {preview.lobbies.map((lobby) => `${lobby.name} (${lobby.entryCount})`).join(", ")}
                  </p>
                </div>
                <div className="space-y-2">
                  {preview.standings.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                      No scored teams are available for this merge yet.
                    </div>
                  ) : (
                    preview.standings.map((entry) => (
                      <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={`${entry.normalizedTeamName}-${entry.rank}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold text-white">
                              #{entry.rank} {entry.teamName}
                            </p>
                            <p className="mt-2 text-sm text-slate-300">
                              {entry.matchesPlayed} matches | {entry.kills} kills | {entry.placementPoints} placement pts
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                              {entry.lobbyNames.join(", ")}
                            </p>
                          </div>
                          <p className="font-display text-2xl font-semibold text-cyan-100">{entry.totalPoints}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                Select lobbies or a saved preset to calculate merged standings.
              </div>
            )}
          </div>
        </Panel>
      </div>
    </section>
  );
}
