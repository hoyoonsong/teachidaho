import { useCallback, useEffect, useState } from "react";
import { PencilIconButton } from "../ui/PencilIconButton";
import {
  createRegistrationTeam,
  deleteRegistrationTeam,
  listTeamsForRegistration,
  parseMemberNamesText,
  updateRegistrationTeam,
  type RegistrationTeamRecord,
} from "../../lib/appDataStore";

function memberNamesToEditableText(names: string[]): string {
  return names.join(", ");
}

type RegistrationTeamsEditorProps = {
  registrationId: string | null;
  /** Called after any mutation so parent can refresh lists */
  onTeamsChanged?: () => void;
  /** Section title */
  title?: string;
  /** Lighter chrome when nested inside another card (e.g. admin registrations). */
  variant?: "default" | "embedded";
};

export function RegistrationTeamsEditor({
  registrationId,
  onTeamsChanged,
  title = "Teams",
  variant = "default",
}: RegistrationTeamsEditorProps) {
  const embedded = variant === "embedded";
  const [teams, setTeams] = useState<RegistrationTeamRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newMembers, setNewMembers] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editMembers, setEditMembers] = useState("");

  const load = useCallback(async () => {
    if (!registrationId) {
      setTeams([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listTeamsForRegistration(registrationId);
      setTeams(rows);
    } catch (e) {
      console.warn(e);
      setError("Could not load teams.");
      setTeams([]);
    } finally {
      setLoading(false);
    }
  }, [registrationId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    if (!registrationId || !newLabel.trim()) return;
    if (parseMemberNamesText(newMembers).length === 0) {
      setError("Add at least one team member name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const row = await createRegistrationTeam(registrationId, {
        teamLabel: newLabel,
        memberNamesText: newMembers,
      });
      if (row) {
        setNewLabel("");
        setNewMembers("");
        await load();
        onTeamsChanged?.();
      }
    } catch (e) {
      console.warn(e);
      setError("Could not add team.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(t: RegistrationTeamRecord) {
    setEditingId(t.id);
    setEditLabel(t.teamName);
    setEditMembers(memberNamesToEditableText(t.memberNames));
  }

  async function saveEdit(teamId: string) {
    if (!editLabel.trim()) return;
    if (parseMemberNamesText(editMembers).length === 0) {
      setError("Add at least one team member name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateRegistrationTeam(teamId, {
        teamLabel: editLabel,
        memberNamesText: editMembers,
      });
      setEditingId(null);
      await load();
      onTeamsChanged?.();
    } catch (e) {
      console.warn(e);
      setError("Could not update team.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(teamId: string) {
    if (!confirm("Remove this team?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteRegistrationTeam(teamId);
      if (editingId === teamId) setEditingId(null);
      await load();
      onTeamsChanged?.();
    } catch (e) {
      console.warn(e);
      setError("Could not delete team.");
    } finally {
      setSaving(false);
    }
  }

  if (!registrationId) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-500">
        Select an event to manage teams.
      </div>
    );
  }

  return (
    <div
      className={
        embedded
          ? "rounded-xl bg-slate-50/90 p-4 ring-1 ring-slate-200/70"
          : "rounded-xl border border-slate-200 bg-slate-50/50 p-4"
      }
    >
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {embedded ? (
        <p className="mt-1 text-xs text-slate-500">
          Country/team and members (same as teacher view). Comma, newline, or period between names.
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-600">
          Country/team name and member names are required. Separate names with commas, new lines, or
          periods (e.g. &quot;john doe, jane smith&quot;). Admins see the same data on the
          scoreboard.
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm font-medium text-rose-700" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Country / team name *
          </span>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="e.g. Brazil"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Team member names *
          </span>
          <input
            value={newMembers}
            onChange={(e) => setNewMembers(e.target.value)}
            placeholder="e.g. john doe, john smith, john hancock"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          disabled={
            saving ||
            !newLabel.trim() ||
            parseMemberNamesText(newMembers).length === 0
          }
          onClick={() => void handleAdd()}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 sm:mb-0.5"
        >
          Add team
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Loading teams…</p>
      ) : teams.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          No teams yet — add at least one if your event uses them.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {teams.map((t) => (
            <li
              key={t.id}
              className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
            >
              {editingId === t.id ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
                  <label className="block min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Country / team name *
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <label className="block min-w-0 flex-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Team member names *
                    <input
                      value={editMembers}
                      onChange={(e) => setEditMembers(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    <button
                      type="button"
                      disabled={
                        saving ||
                        !editLabel.trim() ||
                        parseMemberNamesText(editMembers).length === 0
                      }
                      onClick={() => void saveEdit(t.id)}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 sm:mb-0.5"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{t.teamName}:</p>
                    {t.memberNames.length > 0 ? (
                      <p className="mt-1 text-sm leading-relaxed text-slate-700">
                        {t.memberNames.join(", ")}
                      </p>
                    ) : (
                      <p className="mt-1 text-xs text-slate-400">No member names yet</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <PencilIconButton
                      onClick={() => startEdit(t)}
                      label={`Edit team ${t.teamName}`}
                      size="sm"
                    />
                    <button
                      type="button"
                      onClick={() => void handleDelete(t.id)}
                      disabled={saving}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
