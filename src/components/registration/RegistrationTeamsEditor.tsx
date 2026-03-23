import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
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
  /** When true, teams are view-only until parent enables editing (e.g. submitted registration). */
  readOnly?: boolean;
  /** Replaces the default “Edit registration” hint when {@link readOnly} is true. */
  readOnlyNotice?: string | null;
  /** Hide the default “teams are locked” notice when the parent shows a unified registration status. */
  hideReadOnlyNotice?: boolean;
  /** Bump when the parent reloads registration row data so teams stay aligned (same moment as snapshot refresh). */
  resyncToken?: number;
};

export function RegistrationTeamsEditor({
  registrationId,
  onTeamsChanged,
  title = "Teams",
  variant = "default",
  readOnly = false,
  readOnlyNotice = null,
  hideReadOnlyNotice = false,
  resyncToken = 0,
}: RegistrationTeamsEditorProps) {
  const embedded = variant === "embedded";
  const membersInputRef = useRef<HTMLInputElement>(null);
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
  }, [load, resyncToken]);

  useEffect(() => {
    if (readOnly) setEditingId(null);
  }, [readOnly]);

  const canAddTeam =
    Boolean(registrationId && newLabel.trim()) &&
    parseMemberNamesText(newMembers).length > 0;

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

  function onNewTeamKeyDown(e: KeyboardEvent, field: "label" | "members") {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (canAddTeam && !saving) {
      void handleAdd();
      return;
    }
    if (field === "label" && newLabel.trim()) {
      membersInputRef.current?.focus();
    }
  }

  const shellClass = embedded
    ? "rounded-lg bg-slate-50/90 p-3 ring-1 ring-slate-200/70"
    : "rounded-xl border border-slate-200 bg-slate-50/50 p-4";

  return (
    <div className={shellClass}>
      <h3
        className={
          embedded
            ? "text-sm font-bold text-slate-900"
            : "text-base font-bold text-slate-900"
        }
      >
        {title}
      </h3>
      {readOnly && readOnlyNotice ? (
        <p
          className={`mt-1.5 rounded-lg border border-amber-200 bg-amber-50/90 px-2.5 py-2 font-medium text-amber-900 ${embedded ? "text-[11px] leading-snug" : "text-xs"}`}
        >
          {readOnlyNotice}
        </p>
      ) : readOnly && !hideReadOnlyNotice ? (
        <p
          className={`mt-1.5 rounded-lg border border-amber-200 bg-amber-50/90 px-2.5 py-2 font-medium text-amber-900 ${embedded ? "text-[11px] leading-snug" : "text-xs"}`}
        >
          Teams are locked. Use <strong>Edit registration</strong> below to add
          or change teams.
        </p>
      ) : embedded ? (
        <p className="mt-0.5 text-[11px] leading-snug text-slate-500"></p>
      ) : (
        <p className="mt-1 text-xs text-slate-600">
          Country/team name and member names are required. Separate names with
          commas, new lines, or periods (e.g. &quot;john doe, jane smith&quot;).
          Admins see the same data on the scoreboard.
        </p>
      )}
      {error && (
        <p
          className={`font-medium text-rose-700 ${embedded ? "mt-1.5 text-xs" : "mt-2 text-sm"}`}
          role="alert"
        >
          {error}
        </p>
      )}

      <div
        className={`flex flex-col sm:flex-row sm:flex-wrap sm:items-end ${embedded ? "mt-2 gap-2" : "mt-4 gap-3"}`}
      >
        <label className="block min-w-0 flex-1">
          <span
            className={
              embedded
                ? "text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                : "text-xs font-semibold uppercase tracking-wide text-slate-500"
            }
          >
            Country / team name *
          </span>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => onNewTeamKeyDown(e, "label")}
            disabled={readOnly}
            placeholder="e.g. Brazil"
            className={
              embedded
                ? "mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                : "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            }
          />
        </label>
        <label className="block min-w-0 flex-1">
          <span
            className={
              embedded
                ? "text-[10px] font-semibold uppercase tracking-wide text-slate-500"
                : "text-xs font-semibold uppercase tracking-wide text-slate-500"
            }
          >
            Team member names *
          </span>
          <input
            ref={membersInputRef}
            value={newMembers}
            onChange={(e) => setNewMembers(e.target.value)}
            onKeyDown={(e) => onNewTeamKeyDown(e, "members")}
            disabled={readOnly}
            placeholder="e.g. john doe, john smith, john hancock"
            className={
              embedded
                ? "mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                : "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            }
          />
        </label>
        <button
          type="button"
          disabled={readOnly || saving || !canAddTeam}
          onClick={() => void handleAdd()}
          className={
            embedded
              ? "shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 sm:mb-px"
              : "shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50 sm:mb-0.5"
          }
        >
          Add team
        </button>
      </div>

      {loading ? (
        <p
          className={`text-slate-500 ${embedded ? "mt-2 text-xs" : "mt-4 text-sm"}`}
        >
          Loading teams…
        </p>
      ) : teams.length === 0 ? (
        <p
          className={`text-slate-500 ${embedded ? "mt-2 text-xs" : "mt-4 text-sm"}`}
        >
          No teams yet — add at least one if your event uses them.
        </p>
      ) : (
        <ul className={`${embedded ? "mt-2 space-y-1.5" : "mt-4 space-y-2"}`}>
          {teams.map((t) => (
            <li
              key={t.id}
              className={
                embedded
                  ? "rounded-md border border-slate-200/90 bg-white px-2.5 py-2 shadow-sm"
                  : "rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
              }
            >
              {editingId === t.id ? (
                <div
                  className={`flex flex-col sm:flex-row sm:flex-wrap sm:items-end ${embedded ? "gap-1.5" : "gap-2"}`}
                >
                  <label
                    className={`block min-w-0 flex-1 font-semibold uppercase tracking-wide text-slate-500 ${embedded ? "text-[10px]" : "text-xs"}`}
                  >
                    Country / team name *
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      disabled={readOnly}
                      className={
                        embedded
                          ? "mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-normal"
                          : "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                      }
                    />
                  </label>
                  <label
                    className={`block min-w-0 flex-1 font-semibold uppercase tracking-wide text-slate-500 ${embedded ? "text-[10px]" : "text-xs"}`}
                  >
                    Team member names *
                    <input
                      value={editMembers}
                      onChange={(e) => setEditMembers(e.target.value)}
                      disabled={readOnly}
                      className={
                        embedded
                          ? "mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-normal"
                          : "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                      }
                    />
                  </label>
                  <div
                    className={`flex flex-wrap sm:shrink-0 ${embedded ? "gap-1.5" : "gap-2"}`}
                  >
                    <button
                      type="button"
                      disabled={
                        readOnly ||
                        saving ||
                        !editLabel.trim() ||
                        parseMemberNamesText(editMembers).length === 0
                      }
                      onClick={() => void saveEdit(t.id)}
                      className={
                        embedded
                          ? "rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
                          : "rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 sm:mb-0.5"
                      }
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className={
                        embedded
                          ? "rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                          : "rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700"
                      }
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        embedded
                          ? "text-sm font-semibold text-slate-900"
                          : "font-semibold text-slate-900"
                      }
                    >
                      {embedded ? t.teamName : `${t.teamName}:`}
                    </p>
                    {t.memberNames.length > 0 ? (
                      <p
                        className={
                          embedded
                            ? "mt-0.5 text-[11px] leading-snug text-slate-600"
                            : "mt-1 text-sm leading-relaxed text-slate-700"
                        }
                      >
                        {t.memberNames.join(", ")}
                      </p>
                    ) : (
                      <p
                        className={
                          embedded
                            ? "mt-0.5 text-[10px] text-slate-400"
                            : "mt-1 text-xs text-slate-400"
                        }
                      >
                        No member names yet
                      </p>
                    )}
                  </div>
                  <div
                    className={`flex shrink-0 ${embedded ? "gap-1" : "gap-2"}`}
                  >
                    {!readOnly ? (
                      <>
                        <PencilIconButton
                          onClick={() => startEdit(t)}
                          label={`Edit team ${t.teamName}`}
                          size="sm"
                        />
                        <button
                          type="button"
                          onClick={() => void handleDelete(t.id)}
                          disabled={saving}
                          className={
                            embedded
                              ? "rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                              : "rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                          }
                        >
                          Remove
                        </button>
                      </>
                    ) : null}
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
