import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildLobbyStandings,
  defaultPointSystemSettings,
  normalizeCompetitionTeamName,
  sanitizeCompetitionTeamName,
  type PointSystemSettings,
} from "@contracts/competition-contract";
import { PlusCircle, RefreshCcw, Save, ShieldCheck, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/ui/panel";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { fetchPointSystemSettings } from "@/features/settings/api/settings-client";
import { ApiClientError } from "@/lib/http-client";

import {
  createGroup,
  createLobby,
  createScrim,
  createTier,
  deleteGroup,
  deleteLobby,
  deleteScrim,
  deleteTier,
  fetchScrimsState,
  renameGroup,
  renameLobby,
  renameScrim,
  renameTier,
  replaceLobbyEntries,
  type EditableLobbyEntryPayload,
  type LobbyEntryRecord,
  type ScrimsState,
} from "./api/scrims-client";

type DraftLobbyEntry = EditableLobbyEntryPayload;
type LobbySyncState = "conflict" | "idle" | "saved" | "saving" | "stale" | "syncing";

const MAX_DRAFT_ROWS = 16;

function formatScrimError(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unable to load the scrim workspace.";
}

function createBlankDraftEntry(slotNumber: number | null = null): DraftLobbyEntry {
  return {
    kills: 0,
    position: null,
    slotNumber,
    teamName: "",
  };
}

function fillDraftEntries(entries: DraftLobbyEntry[]) {
  const nextEntries = [...entries];

  while (nextEntries.length < MAX_DRAFT_ROWS) {
    nextEntries.push(createBlankDraftEntry(nextEntries.length + 1));
  }

  return nextEntries;
}

function toDraftEntries(entries: LobbyEntryRecord[]) {
  return fillDraftEntries(
    entries.map((entry) => ({
      kills: entry.kills,
      position: entry.position,
      slotNumber: entry.slotNumber,
      teamName: entry.teamName,
    })),
  );
}

function serializeEntries(entries: DraftLobbyEntry[]) {
  return JSON.stringify(
    entries.map((entry) => ({
      kills: entry.kills,
      position: entry.position,
      slotNumber: entry.slotNumber,
      teamName: sanitizeCompetitionTeamName(entry.teamName),
    })),
  );
}

function getValidationMessage(entries: DraftLobbyEntry[]) {
  const normalizedNames = new Set<string>();
  const usedPositions = new Set<number>();

  for (const entry of entries) {
    const teamName = sanitizeCompetitionTeamName(entry.teamName);
    const hasData = teamName.length > 0 || entry.kills > 0 || entry.position !== null;

    if (!hasData) {
      continue;
    }

    if (teamName.length === 0) {
      return "Team name is required whenever position or kills are entered.";
    }

    const normalizedName = normalizeCompetitionTeamName(teamName);
    if (normalizedNames.has(normalizedName)) {
      return "Duplicate team names are not allowed inside the same lobby.";
    }

    normalizedNames.add(normalizedName);

    if (entry.position !== null) {
      if (usedPositions.has(entry.position)) {
        return "Duplicate finishing positions are not allowed inside the same lobby.";
      }

      usedPositions.add(entry.position);
    }
  }

  return null;
}

function mergeSavedLobbyState(
  state: ScrimsState,
  lobby: ScrimsState["lobbies"][number],
  entries: LobbyEntryRecord[],
): ScrimsState {
  return {
    ...state,
    lobbies: state.lobbies.map((entry) => (entry.id === lobby.id ? lobby : entry)),
    lobbyEntries: [
      ...state.lobbyEntries.filter((entry) => entry.lobbyId !== lobby.id),
      ...entries,
    ],
  };
}

function getSyncStateLabel(syncState: LobbySyncState) {
  switch (syncState) {
    case "saving":
      return "Saving...";
    case "saved":
      return "Saved";
    case "syncing":
      return "Syncing...";
    case "stale":
      return "Stale";
    case "conflict":
      return "Update Conflict";
    default:
      return "Idle";
  }
}

export function ScrimsPage() {
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
  const [pointSystem, setPointSystem] = useState<PointSystemSettings>(defaultPointSystemSettings);
  const [selectedScrimId, setSelectedScrimId] = useState("");
  const [selectedLobbyId, setSelectedLobbyId] = useState("");
  const [draftEntries, setDraftEntries] = useState<DraftLobbyEntry[]>(fillDraftEntries([]));
  const [syncState, setSyncState] = useState<LobbySyncState>("idle");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scrimName, setScrimName] = useState("");
  const [scrimDescription, setScrimDescription] = useState("");
  const [tierName, setTierName] = useState("");
  const [groupTierId, setGroupTierId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [lobbyGroupId, setLobbyGroupId] = useState("");
  const [lobbyName, setLobbyName] = useState("");
  const lastPersistedSignatureRef = useRef<string>("");
  const activeLobbyIdRef = useRef<string>("");
  const activeLobbyUpdatedAtRef = useRef<string>("");
  const saveInFlightRef = useRef(false);

  const selectedScrimTiers = useMemo(
    () =>
      state.tiers
        .filter((tier) => tier.scrimId === selectedScrimId)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)),
    [selectedScrimId, state.tiers],
  );

  const selectedTierIds = useMemo(() => new Set(selectedScrimTiers.map((tier) => tier.id)), [selectedScrimTiers]);

  const selectedScrimGroups = useMemo(
    () =>
      state.groups
        .filter((group) => selectedTierIds.has(group.tierId))
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)),
    [selectedTierIds, state.groups],
  );

  const selectedGroupIds = useMemo(() => new Set(selectedScrimGroups.map((group) => group.id)), [selectedScrimGroups]);

  const selectedScrimLobbies = useMemo(
    () =>
      state.lobbies
        .filter((lobby) => selectedGroupIds.has(lobby.groupId))
        .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)),
    [selectedGroupIds, state.lobbies],
  );

  const selectedLobby = useMemo(
    () => state.lobbies.find((lobby) => lobby.id === selectedLobbyId) ?? null,
    [selectedLobbyId, state.lobbies],
  );

  const currentLobbyEntries = useMemo(
    () =>
      state.lobbyEntries
        .filter((entry) => entry.lobbyId === selectedLobbyId)
        .sort((left, right) => left.rank - right.rank || left.teamName.localeCompare(right.teamName)),
    [selectedLobbyId, state.lobbyEntries],
  );

  const validationMessage = useMemo(() => getValidationMessage(draftEntries), [draftEntries]);

  const previewStandings = useMemo(
    () =>
      buildLobbyStandings(
        draftEntries
          .filter((entry) => {
            const teamName = sanitizeCompetitionTeamName(entry.teamName);
            return teamName.length > 0 || entry.kills > 0 || entry.position !== null;
          })
          .map((entry) => ({
            kills: entry.kills,
            position: entry.position,
            slotNumber: entry.slotNumber,
            teamName: entry.teamName,
          })),
        pointSystem,
      ),
    [draftEntries, pointSystem],
  );

  const previewLookup = useMemo(
    () =>
      new Map(
        previewStandings.map((entry) => [`${entry.normalizedTeamName}:${entry.slotNumber ?? "na"}`, entry]),
      ),
    [previewStandings],
  );

  async function loadState(options?: { background?: boolean }) {
    if (!options?.background) {
      setError(null);
    } else {
      setSyncState((current) => (current === "idle" ? "syncing" : current));
    }

    try {
      const [nextState, nextPointSystem] = await Promise.all([fetchScrimsState(), fetchPointSystemSettings()]);

      setState(nextState);
      setPointSystem(nextPointSystem);

      const fallbackScrimId =
        nextState.scrims.find((scrim) => scrim.id === selectedScrimId)?.id ?? nextState.scrims[0]?.id ?? "";
      setSelectedScrimId(fallbackScrimId);

      const fallbackLobbyId =
        nextState.lobbies.find((lobby) => lobby.id === selectedLobbyId)?.id ?? nextState.lobbies[0]?.id ?? "";
      setSelectedLobbyId(fallbackLobbyId);
    } catch (nextError) {
      setError(formatScrimError(nextError));
    } finally {
      if (options?.background) {
        setSyncState((current) => (current === "syncing" ? "idle" : current));
      }
    }
  }

  useEffect(() => {
    void loadState();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadState({ background: true });
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [selectedLobbyId, selectedScrimId]);

  useEffect(() => {
    if (!selectedScrimId && state.scrims[0]) {
      setSelectedScrimId(state.scrims[0].id);
    }
  }, [selectedScrimId, state.scrims]);

  useEffect(() => {
    if (!selectedScrimTiers.find((tier) => tier.id === groupTierId)) {
      setGroupTierId(selectedScrimTiers[0]?.id ?? "");
    }
  }, [groupTierId, selectedScrimTiers]);

  useEffect(() => {
    if (!selectedScrimGroups.find((group) => group.id === lobbyGroupId)) {
      setLobbyGroupId(selectedScrimGroups[0]?.id ?? "");
    }
  }, [lobbyGroupId, selectedScrimGroups]);

  useEffect(() => {
    const nextLobbyId =
      selectedScrimLobbies.find((lobby) => lobby.id === selectedLobbyId)?.id ?? selectedScrimLobbies[0]?.id ?? "";

    if (nextLobbyId !== selectedLobbyId) {
      setSelectedLobbyId(nextLobbyId);
    }
  }, [selectedLobbyId, selectedScrimLobbies]);

  useEffect(() => {
    if (!selectedLobbyId || !selectedLobby) {
      const blankEntries = fillDraftEntries([]);
      setDraftEntries(blankEntries);
      lastPersistedSignatureRef.current = serializeEntries(blankEntries);
      activeLobbyIdRef.current = "";
      activeLobbyUpdatedAtRef.current = "";
      setSyncState("idle");
      return;
    }

    const nextDraftEntries = toDraftEntries(currentLobbyEntries);
    const nextSignature = serializeEntries(nextDraftEntries);
    const currentSignature = serializeEntries(draftEntries);
    const lobbyChanged = activeLobbyIdRef.current !== selectedLobbyId;
    const remoteChanged = activeLobbyUpdatedAtRef.current !== selectedLobby.updatedAt;
    const hasLocalUnsavedChanges = currentSignature !== lastPersistedSignatureRef.current;

    if (lobbyChanged || (!hasLocalUnsavedChanges && remoteChanged)) {
      setDraftEntries(nextDraftEntries);
      lastPersistedSignatureRef.current = nextSignature;
      activeLobbyIdRef.current = selectedLobbyId;
      activeLobbyUpdatedAtRef.current = selectedLobby.updatedAt;
      setSyncState((current) => (current === "saving" ? current : "idle"));
      return;
    }

    if (remoteChanged) {
      activeLobbyUpdatedAtRef.current = selectedLobby.updatedAt;
      setSyncState("stale");
      setStatusMessage(
        `Remote updates detected from ${selectedLobby.lastUpdatedByUsername ?? "another user"}. Reload the server copy before saving again.`,
      );
    }
  }, [currentLobbyEntries, draftEntries, selectedLobby, selectedLobbyId]);

  useEffect(() => {
    if (!selectedLobbyId || !selectedLobby || saveInFlightRef.current) {
      return;
    }

    if (syncState === "stale" || syncState === "conflict") {
      return;
    }

    const currentSignature = serializeEntries(draftEntries);
    if (currentSignature === lastPersistedSignatureRef.current || validationMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveInFlightRef.current = true;
      setSyncState("saving");
      setError(null);

      void replaceLobbyEntries(selectedLobbyId, draftEntries, selectedLobby.updatedAt)
        .then((response) => {
          setState((current) => mergeSavedLobbyState(current, response.lobby, response.entries));
          lastPersistedSignatureRef.current = currentSignature;
          activeLobbyUpdatedAtRef.current = response.lobby.updatedAt;
          setSyncState("saved");
          setStatusMessage(`Lobby autosaved at ${new Date().toLocaleTimeString()}.`);
        })
        .catch((nextError) => {
          if (nextError instanceof ApiClientError && nextError.code === "LOBBY_STALE_STATE") {
            setSyncState("conflict");
            setStatusMessage(
              typeof nextError.details === "object" &&
                nextError.details !== null &&
                "lastUpdatedByUsername" in nextError.details &&
                typeof nextError.details.lastUpdatedByUsername === "string"
                ? `Save blocked. Latest lobby change came from ${nextError.details.lastUpdatedByUsername}. Reload the remote copy before retrying.`
                : "Save blocked because a newer lobby revision exists on the server.",
            );
          } else {
            setSyncState("idle");
          }

          setError(formatScrimError(nextError));
        })
        .finally(() => {
          saveInFlightRef.current = false;
        });
    }, 800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [draftEntries, selectedLobby, selectedLobbyId, syncState, validationMessage]);

  async function handleCreateScrim() {
    setError(null);
    setStatusMessage(null);

    try {
      const scrim = await createScrim({
        description: scrimDescription,
        name: scrimName,
      });
      setScrimName("");
      setScrimDescription("");
      setSelectedScrimId(scrim.id);
      setStatusMessage(`Scrim ${scrim.name} created.`);
      await loadState();
    } catch (nextError) {
      setError(formatScrimError(nextError));
    }
  }

  async function handleCreateTier() {
    if (!selectedScrimId) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      await createTier({
        name: tierName,
        scrimId: selectedScrimId,
        sortOrder: selectedScrimTiers.length,
      });
      setTierName("");
      setStatusMessage("Tier created.");
      await loadState();
    } catch (nextError) {
      setError(formatScrimError(nextError));
    }
  }

  async function handleCreateGroup() {
    const targetTier = selectedScrimTiers.find((tier) => tier.id === groupTierId);
    if (!targetTier) {
      return;
    }

    const groupsForTier = selectedScrimGroups.filter((group) => group.tierId === targetTier.id);

    setError(null);
    setStatusMessage(null);

    try {
      await createGroup({
        name: groupName,
        sortOrder: groupsForTier.length,
        tierId: targetTier.id,
      });
      setGroupName("");
      setStatusMessage("Group created.");
      await loadState();
    } catch (nextError) {
      setError(formatScrimError(nextError));
    }
  }

  async function handleCreateLobby() {
    const targetGroup = selectedScrimGroups.find((group) => group.id === lobbyGroupId);
    if (!targetGroup) {
      return;
    }

    const lobbiesForGroup = selectedScrimLobbies.filter((lobby) => lobby.groupId === targetGroup.id);

    setError(null);
    setStatusMessage(null);

    try {
      await createLobby({
        groupId: targetGroup.id,
        name: lobbyName,
        sortOrder: lobbiesForGroup.length,
      });
      setLobbyName("");
      setStatusMessage("Lobby created.");
      await loadState();
    } catch (nextError) {
      setError(formatScrimError(nextError));
    }
  }

  async function handleRenameScrim() {
    const activeScrim = state.scrims.find((scrim) => scrim.id === selectedScrimId);
    const nextName = window.prompt("Rename scrim", activeScrim?.name ?? "");

    if (!activeScrim || !nextName?.trim()) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      await renameScrim(activeScrim.id, nextName.trim());
      setStatusMessage(`Scrim renamed to ${nextName.trim()}.`);
      await loadState();
    } catch (nextError) {
      setError(formatScrimError(nextError));
    }
  }

  async function handleDeleteScrim() {
    const activeScrim = state.scrims.find((scrim) => scrim.id === selectedScrimId);

    if (!activeScrim) {
      return;
    }

    const tierIds = state.tiers.filter((tier) => tier.scrimId === activeScrim.id).map((tier) => tier.id);
    const groupIds = state.groups.filter((group) => tierIds.includes(group.tierId)).map((group) => group.id);
    const lobbyIds = state.lobbies.filter((lobby) => groupIds.includes(lobby.groupId)).map((lobby) => lobby.id);
    const mergePresetCount = state.mergePresets.filter((preset) => preset.scrimId === activeScrim.id).length;
    const confirmed = window.confirm(
      `Delete scrim ${activeScrim.name}? This removes ${tierIds.length} tiers, ${groupIds.length} groups, ${lobbyIds.length} lobbies, ${state.lobbyEntries.filter((entry) => lobbyIds.includes(entry.lobbyId)).length} live entries, and ${mergePresetCount} merge presets.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setStatusMessage(null);

    try {
      await deleteScrim(activeScrim.id);
      setStatusMessage(`Scrim ${activeScrim.name} deleted.`);
      await loadState();
    } catch (nextError) {
      setError(formatScrimError(nextError));
    }
  }

  async function handleRenameTier(id: string, currentName: string) {
    const nextName = window.prompt("Rename tier", currentName);

    if (!nextName?.trim()) {
      return;
    }

    try {
      await renameTier(id, nextName.trim());
      setStatusMessage(`Tier renamed to ${nextName.trim()}.`);
      await loadState();
    } catch (nextError) {
      setError(formatScrimError(nextError));
    }
  }

  async function handleDeleteTier(id: string, name: string) {
    const groupIds = state.groups.filter((group) => group.tierId === id).map((group) => group.id);
    const lobbyIds = state.lobbies.filter((lobby) => groupIds.includes(lobby.groupId)).map((lobby) => lobby.id);
    const confirmed = window.confirm(
      `Delete tier ${name}? This removes ${groupIds.length} groups, ${lobbyIds.length} lobbies, and ${state.lobbyEntries.filter((entry) => lobbyIds.includes(entry.lobbyId)).length} live entries.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteTier(id);
      setStatusMessage(`Tier ${name} deleted.`);
      await loadState();
    } catch (nextError) {
      setError(formatScrimError(nextError));
    }
  }

  async function handleRenameGroup(id: string, currentName: string) {
    const nextName = window.prompt("Rename group", currentName);

    if (!nextName?.trim()) {
      return;
    }

    try {
      await renameGroup(id, nextName.trim());
      setStatusMessage(`Group renamed to ${nextName.trim()}.`);
      await loadState();
    } catch (nextError) {
      setError(formatScrimError(nextError));
    }
  }

  async function handleDeleteGroup(id: string, name: string) {
    const lobbyIds = state.lobbies.filter((lobby) => lobby.groupId === id).map((lobby) => lobby.id);
    const confirmed = window.confirm(
      `Delete group ${name}? This removes ${lobbyIds.length} lobbies and ${state.lobbyEntries.filter((entry) => lobbyIds.includes(entry.lobbyId)).length} live entries.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteGroup(id);
      setStatusMessage(`Group ${name} deleted.`);
      await loadState();
    } catch (nextError) {
      setError(formatScrimError(nextError));
    }
  }

  async function handleRenameSelectedLobby() {
    if (!selectedLobby) {
      return;
    }

    const nextName = window.prompt("Rename lobby", selectedLobby.name);

    if (!nextName?.trim()) {
      return;
    }

    try {
      await renameLobby(selectedLobby.id, nextName.trim());
      setStatusMessage(`Lobby renamed to ${nextName.trim()}.`);
      await loadState();
    } catch (nextError) {
      setError(formatScrimError(nextError));
    }
  }

  async function handleDeleteSelectedLobby() {
    if (!selectedLobby) {
      return;
    }

    const confirmed = window.confirm(
      `Delete lobby ${selectedLobby.name}? This removes ${currentLobbyEntries.length} live entries from the selected lobby.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteLobby(selectedLobby.id);
      setStatusMessage(`Lobby ${selectedLobby.name} deleted.`);
      await loadState();
    } catch (nextError) {
      setError(formatScrimError(nextError));
    }
  }

  function updateDraftEntry(index: number, patch: Partial<DraftLobbyEntry>) {
    if (syncState === "saved") {
      setSyncState("idle");
    }

    setDraftEntries((current) =>
      current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, ...patch } : entry)),
    );
  }

  function handleReloadLobbyFromServer() {
    const nextDraftEntries = toDraftEntries(currentLobbyEntries);
    setDraftEntries(nextDraftEntries);
    lastPersistedSignatureRef.current = serializeEntries(nextDraftEntries);
    activeLobbyUpdatedAtRef.current = selectedLobby?.updatedAt ?? "";
    setSyncState("idle");
    setStatusMessage("Reloaded the latest lobby state from the server.");
    setError(null);
  }

  const statusClassName =
    syncState === "stale" || syncState === "conflict"
      ? "mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
      : syncState === "syncing"
        ? "mt-5 rounded-2xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100"
        : "mt-5 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100";

  return (
    <section className="space-y-5">
      <Panel className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Competition Control</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-white">Scrims Workspace</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Build the live tournament structure, edit lobby standings with conflict-safe autosave, and keep point calculations synchronized across simultaneous operators.
            </p>
          </div>
          <Button className="sm:w-auto" onClick={() => void loadState()} variant="secondary">
            <RefreshCcw className="mr-2 size-4" />
            Sync Now
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Scrims</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{state.scrims.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Lobbies</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{state.lobbies.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Live Entries</p>
            <p className="mt-3 font-display text-3xl font-semibold text-white">{state.lobbyEntries.length}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Collaboration</p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-cyan-100">
              <ShieldCheck className="size-4" />
              {getSyncStateLabel(syncState)}
            </p>
          </div>
        </div>

        {statusMessage ? <div className={statusClassName}>{statusMessage}</div> : null}
        {validationMessage ? (
          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {validationMessage}
          </div>
        ) : null}
        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[0.94fr_1.06fr]">
        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Structure</p>
                <p className="mt-2 font-display text-2xl font-semibold text-white">Tier / Group / Lobby Tree</p>
              </div>
              <div className="flex flex-wrap gap-2">
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
                {isAdmin && selectedScrimId ? (
                  <>
                    <Button className="sm:w-auto" onClick={() => void handleRenameScrim()} variant="secondary">
                      Rename
                    </Button>
                    <Button className="sm:w-auto" onClick={() => void handleDeleteScrim()} variant="secondary">
                      Delete
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            {selectedScrimTiers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                No tiers exist for the selected scrim yet.
              </div>
            ) : (
              selectedScrimTiers.map((tier) => {
                const tierGroups = selectedScrimGroups.filter((group) => group.tierId === tier.id);
                return (
                  <div className="rounded-3xl border border-white/10 bg-black/18 p-4" key={tier.id}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-white">{tier.name}</p>
                      {isAdmin ? (
                        <div className="flex flex-wrap gap-2">
                          <Button className="sm:w-auto" onClick={() => void handleRenameTier(tier.id, tier.name)} variant="secondary">
                            Rename
                          </Button>
                          <Button className="sm:w-auto" onClick={() => void handleDeleteTier(tier.id, tier.name)} variant="secondary">
                            Delete
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 space-y-3">
                      {tierGroups.length === 0 ? (
                        <p className="text-sm text-slate-500">No groups yet.</p>
                      ) : (
                        tierGroups.map((group) => {
                          const groupLobbies = selectedScrimLobbies.filter((lobby) => lobby.groupId === group.id);
                          return (
                            <div className="rounded-2xl border border-white/8 bg-white/5 p-3" key={group.id}>
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-100">{group.name}</p>
                                {isAdmin ? (
                                  <div className="flex flex-wrap gap-2">
                                    <Button className="sm:w-auto" onClick={() => void handleRenameGroup(group.id, group.name)} variant="secondary">
                                      Rename
                                    </Button>
                                    <Button className="sm:w-auto" onClick={() => void handleDeleteGroup(group.id, group.name)} variant="secondary">
                                      Delete
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {groupLobbies.length === 0 ? (
                                  <span className="text-xs text-slate-500">No lobbies yet.</span>
                                ) : (
                                  groupLobbies.map((lobby) => (
                                    <button
                                      className={
                                        lobby.id === selectedLobbyId
                                          ? "rounded-full border border-cyan-300/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100"
                                          : "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300"
                                      }
                                      key={lobby.id}
                                      onClick={() => setSelectedLobbyId(lobby.id)}
                                      type="button"
                                    >
                                      {lobby.name}
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Panel>

        <Panel className="p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Lobby Editor</p>
                <p className="mt-2 font-display text-2xl font-semibold text-white">
                  {selectedLobby?.name ?? "Select a lobby"}
                </p>
                {selectedLobby ? (
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    Last updated {new Date(selectedLobby.updatedAt).toLocaleString()}
                    {selectedLobby.lastUpdatedByUsername ? ` by ${selectedLobby.lastUpdatedByUsername}` : ""}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                  <Target className="size-4 text-cyan-200" />
                  Kills x {pointSystem.killPointValue}
                </div>
                {isAdmin && selectedLobby ? (
                  <>
                    <Button className="sm:w-auto" onClick={() => void handleRenameSelectedLobby()} variant="secondary">
                      Rename
                    </Button>
                    <Button className="sm:w-auto" onClick={() => void handleDeleteSelectedLobby()} variant="secondary">
                      Delete
                    </Button>
                  </>
                ) : null}
                {(syncState === "stale" || syncState === "conflict") && selectedLobbyId ? (
                  <Button className="sm:w-auto" onClick={handleReloadLobbyFromServer} variant="secondary">
                    <RefreshCcw className="mr-2 size-4" />
                    Reload Remote
                  </Button>
                ) : null}
              </div>
            </div>

            {selectedLobbyId ? (
              <div className="space-y-3">
                <div className="grid grid-cols-[0.8fr_2.1fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-3 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  <span>Slot</span>
                  <span>Team</span>
                  <span>Pos</span>
                  <span>Kills</span>
                  <span>Total</span>
                  <span>Rank</span>
                </div>

                {draftEntries.map((entry, index) => {
                  const lookupKey = `${normalizeCompetitionTeamName(entry.teamName || `slot-${index}`)}:${entry.slotNumber ?? "na"}`;
                  const previewEntry =
                    sanitizeCompetitionTeamName(entry.teamName).length > 0 ? previewLookup.get(lookupKey) : null;

                  return (
                    <div className="grid grid-cols-[0.8fr_2.1fr_0.9fr_0.9fr_0.9fr_0.9fr] gap-3" key={`${selectedLobbyId}-${index}`}>
                      <Input
                        onChange={(event) =>
                          updateDraftEntry(index, {
                            slotNumber: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                        type="number"
                        value={entry.slotNumber ?? ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDraftEntry(index, {
                            teamName: event.target.value,
                          })
                        }
                        placeholder="Team name"
                        value={entry.teamName}
                      />
                      <Input
                        onChange={(event) =>
                          updateDraftEntry(index, {
                            position: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                        type="number"
                        value={entry.position ?? ""}
                      />
                      <Input
                        onChange={(event) =>
                          updateDraftEntry(index, {
                            kills: event.target.value ? Number(event.target.value) : 0,
                          })
                        }
                        type="number"
                        value={entry.kills}
                      />
                      <div className="flex h-12 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-200">
                        {previewEntry?.totalPoints ?? 0}
                      </div>
                      <div className="flex h-12 items-center rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-slate-200">
                        {previewEntry?.rank ?? "-"}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-white/4 px-4 py-6 text-sm text-slate-500">
                Select a lobby to begin live scoring.
              </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-black/18 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Save className="size-4 text-cyan-200" />
                Autosave Preview
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                {previewStandings.length === 0 ? (
                  <p className="text-slate-500">No scored entries yet.</p>
                ) : (
                  previewStandings.slice(0, 8).map((entry) => (
                    <div className="flex items-center justify-between gap-4" key={`${entry.normalizedTeamName}-${entry.rank}`}>
                      <span>
                        #{entry.rank} {entry.teamName}
                      </span>
                      <span>
                        {entry.totalPoints} pts / {entry.kills} kills
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {isAdmin ? (
        <Panel className="p-5 sm:p-6">
          <div className="grid gap-5 xl:grid-cols-4">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Create Scrim</p>
              <Input onChange={(event) => setScrimName(event.target.value)} placeholder="Scrim name" value={scrimName} />
              <Textarea
                className="min-h-[120px]"
                onChange={(event) => setScrimDescription(event.target.value)}
                placeholder="Describe the scrim or event."
                value={scrimDescription}
              />
              <Button className="sm:w-auto" disabled={scrimName.trim().length < 3} onClick={() => void handleCreateScrim()}>
                <PlusCircle className="mr-2 size-4" />
                Save Scrim
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Create Tier</p>
              <Input onChange={(event) => setTierName(event.target.value)} placeholder="Tier name" value={tierName} />
              <Button
                className="sm:w-auto"
                disabled={tierName.trim().length < 2 || !selectedScrimId}
                onClick={() => void handleCreateTier()}
                variant="secondary"
              >
                <PlusCircle className="mr-2 size-4" />
                Add Tier
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Create Group</p>
              <Select onChange={(event) => setGroupTierId(event.target.value)} value={groupTierId}>
                <option className="bg-slate-950" value="">
                  Select tier
                </option>
                {selectedScrimTiers.map((tier) => (
                  <option className="bg-slate-950" key={tier.id} value={tier.id}>
                    {tier.name}
                  </option>
                ))}
              </Select>
              <Input onChange={(event) => setGroupName(event.target.value)} placeholder="Group name" value={groupName} />
              <Button
                className="sm:w-auto"
                disabled={groupName.trim().length < 2 || !groupTierId}
                onClick={() => void handleCreateGroup()}
                variant="secondary"
              >
                <PlusCircle className="mr-2 size-4" />
                Add Group
              </Button>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Create Lobby</p>
              <Select onChange={(event) => setLobbyGroupId(event.target.value)} value={lobbyGroupId}>
                <option className="bg-slate-950" value="">
                  Select group
                </option>
                {selectedScrimGroups.map((group) => (
                  <option className="bg-slate-950" key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
              <Input onChange={(event) => setLobbyName(event.target.value)} placeholder="Lobby name" value={lobbyName} />
              <Button
                className="sm:w-auto"
                disabled={lobbyName.trim().length < 2 || !lobbyGroupId}
                onClick={() => void handleCreateLobby()}
                variant="secondary"
              >
                <PlusCircle className="mr-2 size-4" />
                Add Lobby
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}
    </section>
  );
}
