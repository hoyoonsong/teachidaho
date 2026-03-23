import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminModal } from "../../components/admin/AdminModal";
import { PencilIconButton } from "../../components/ui/PencilIconButton";
import { RegistrationTeamsEditor } from "../../components/registration/RegistrationTeamsEditor";
import {
  REGISTRATION_SOFT_DELETE_RETENTION_MS,
  deleteRegistration,
  listEvents,
  listRegistrationsForEvent,
  listSoftDeletedRegistrationsForEvent,
  moveRegistrationToEvent,
  permanentlyDeleteRegistration,
  restoreDeletedRegistration,
  updateRegistrationFields,
  type EventRecord,
  type RegistrationDetailRecord,
} from "../../lib/appDataStore";
import type { FormSubmissionPayload } from "../../types/forms";

type AdminEventRegistrationsPageProps = {
  eventId: string;
};

function payloadString(payload: FormSubmissionPayload, key: string): string {
  const v = payload[key];
  if (v === undefined || v === null) return "";
  if (typeof v === "boolean") return "";
  return String(v).trim();
}

function daysUntilRegistrationPurge(deletedAt: string): number {
  const end =
    new Date(deletedAt).getTime() + REGISTRATION_SOFT_DELETE_RETENTION_MS;
  return Math.max(0, Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000)));
}

function formatRegistrationActionError(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message.trim()) return e.message;
  if (e && typeof e === "object" && "message" in e) {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown };
    const parts = [o.message, o.details, o.hint]
      .map((x) => (typeof x === "string" && x.trim() ? x : ""))
      .filter(Boolean);
    if (parts.length) return parts.join(" — ");
  }
  return fallback;
}

export function AdminEventRegistrationsPage({
  eventId,
}: AdminEventRegistrationsPageProps) {
  const [rows, setRows] = useState<RegistrationDetailRecord[]>([]);
  const [deletedRows, setDeletedRows] = useState<RegistrationDetailRecord[]>(
    [],
  );
  const [edits, setEdits] = useState<
    Record<
      string,
      { schoolName: string; className: string; teacherNotes: string }
    >
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [adminModalId, setAdminModalId] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState<EventRecord[]>([]);
  const [moveModalId, setMoveModalId] = useState<string | null>(null);
  const [moveTargetEventId, setMoveTargetEventId] = useState("");
  const [deleteModalId, setDeleteModalId] = useState<string | null>(null);
  const [purgeForeverModalId, setPurgeForeverModalId] = useState<string | null>(
    null,
  );
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [trashError, setTrashError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const evs = await listEvents();
      setAllEvents(evs);
    })();
  }, []);

  const load = useCallback(async () => {
    const [next, deleted] = await Promise.all([
      listRegistrationsForEvent(eventId),
      listSoftDeletedRegistrationsForEvent(eventId),
    ]);
    setRows(next);
    setDeletedRows(deleted);
    setTrashError(null);
    const initial: typeof edits = {};
    for (const r of next) {
      initial[r.id] = {
        schoolName: r.schoolName,
        className: r.className ?? "",
        teacherNotes: r.teacherNotes ?? "",
      };
    }
    setEdits(initial);
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSaveSchoolClass(registrationId: string) {
    const patch = edits[registrationId];
    if (!patch) return;
    setSavingId(registrationId);
    try {
      await updateRegistrationFields(registrationId, {
        school_name: patch.schoolName,
        class_name: patch.className.trim() ? patch.className : null,
      });
      await load();
      setAdminModalId(null);
    } finally {
      setSavingId(null);
    }
  }

  const moveTargetOptions = allEvents
    .filter((e) => e.id !== eventId)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  async function handleMoveRegistration(registrationId: string) {
    if (!moveTargetEventId) {
      setActionError("Choose a destination event.");
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      await moveRegistrationToEvent(registrationId, moveTargetEventId);
      setMoveModalId(null);
      setMoveTargetEventId("");
      await load();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not move registration.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDeleteRegistration(registrationId: string) {
    setActionBusy(true);
    setActionError(null);
    try {
      await deleteRegistration(registrationId);
      setDeleteModalId(null);
      await load();
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not delete registration.",
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handlePurgeRegistrationForever(registrationId: string) {
    setActionBusy(true);
    setActionError(null);
    try {
      await permanentlyDeleteRegistration(registrationId);
      setPurgeForeverModalId(null);
      await load();
    } catch (e) {
      setActionError(
        formatRegistrationActionError(e, "Could not remove registration."),
      );
    } finally {
      setActionBusy(false);
    }
  }

  async function handleRestoreRegistration(registrationId: string) {
    setActionBusy(true);
    setTrashError(null);
    try {
      await restoreDeletedRegistration(registrationId);
      await load();
    } catch (e) {
      setTrashError(formatRegistrationActionError(e, "Could not restore."));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleSaveAdminNotes(registrationId: string) {
    const patch = edits[registrationId];
    if (!patch) return;
    setSavingNotesId(registrationId);
    try {
      await updateRegistrationFields(registrationId, {
        teacher_notes: patch.teacherNotes.trim() ? patch.teacherNotes : null,
      });
      await load();
    } finally {
      setSavingNotesId(null);
    }
  }

  const adminModalSubmission = adminModalId
    ? rows.find((r) => r.id === adminModalId)
    : null;
  const adminModalEdits = adminModalId ? edits[adminModalId] : null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Registrations
        </p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
          Teachers &amp; schools
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Each card is one row per signed-in teacher for this event. The
          registration is keyed by account ID, not the school name—so two
          teachers never merge, and renaming a school only changes the label.
        </p>
      </div>

      {rows.length === 0 && deletedRows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No registrations for this event yet.
        </div>
      )}

      {rows.length === 0 && deletedRows.length > 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          No active registrations in the main queue. Open{" "}
          <strong>Recently deleted</strong> below to review removed schools.
        </div>
      )}

      <div className="space-y-4">
        {rows.map((submission) => {
          const teacherName =
            payloadString(submission.payload, "teacherName") || "Teacher";
          const teacherEmail =
            payloadString(submission.payload, "teacherEmail") ||
            submission.submittedBy;
          const formNotes = payloadString(submission.payload, "notes");
          const submittedAt = new Date(submission.createdAt).toLocaleString(
            undefined,
            {
              dateStyle: "medium",
              timeStyle: "short",
            },
          );
          const patch = edits[submission.id];

          return (
            <article
              key={submission.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100"
            >
              <div className="border-l-4 border-l-emerald-600 px-4 pb-4 pt-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="min-w-0 text-lg font-black tracking-tight text-slate-900 sm:text-xl">
                    <span className="text-slate-900">
                      {submission.schoolName}
                    </span>
                    <span className="mx-2 font-medium text-slate-300">—</span>
                    <span className="text-slate-800">{teacherName}</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={moveTargetOptions.length === 0}
                      title={
                        moveTargetOptions.length === 0
                          ? "Create another event before moving registrations"
                          : undefined
                      }
                      onClick={() => {
                        setActionError(null);
                        setMoveTargetEventId(moveTargetOptions[0]?.id ?? "");
                        setMoveModalId(submission.id);
                      }}
                      className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Move to event
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setDeleteModalId(submission.id);
                      }}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 transition hover:bg-rose-100"
                    >
                      Delete
                    </button>
                    <PencilIconButton
                      onClick={() => setAdminModalId(submission.id)}
                      label={`Edit school / class for ${submission.schoolName}`}
                    />
                  </div>
                </div>

                <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm">
                  <summary className="cursor-pointer select-none px-3 py-2.5 font-semibold text-slate-700 hover:bg-slate-100/80">
                    Registration details
                  </summary>
                  <div className="space-y-3 border-t border-slate-200/80 px-3 py-3 text-slate-600">
                    <p className="text-xs">
                      <span className="font-semibold text-slate-700">
                        {teacherEmail}
                      </span>
                      <span className="text-slate-400"> · </span>
                      <span>Submitted {submittedAt}</span>
                    </p>
                    {formNotes ? (
                      <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200/80">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          From teacher (form)
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-slate-700">
                          {formNotes}
                        </p>
                      </div>
                    ) : null}

                    <div className="rounded-lg border border-violet-200 bg-violet-50/90 px-3 py-2.5 ring-1 ring-violet-100">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800">
                          Admin notes
                          <span className="ml-1.5 font-normal normal-case text-violet-700">
                            (internal, editable)
                          </span>
                        </p>
                        <button
                          type="button"
                          disabled={
                            savingNotesId === submission.id ||
                            patch === undefined
                          }
                          onClick={() =>
                            void handleSaveAdminNotes(submission.id)
                          }
                          className="rounded-md bg-violet-700 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-violet-800 disabled:opacity-50"
                        >
                          {savingNotesId === submission.id ? "Saving…" : "Save"}
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={patch?.teacherNotes ?? ""}
                        onChange={(ev) =>
                          setEdits((cur) => {
                            const prev = cur[submission.id];
                            if (!prev) return cur;
                            return {
                              ...cur,
                              [submission.id]: {
                                ...prev,
                                teacherNotes: ev.target.value,
                              },
                            };
                          })
                        }
                        placeholder="Only staff see this…"
                        className="mt-2 w-full resize-y rounded-md border border-violet-200/80 bg-white px-2 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-300"
                      />
                    </div>
                  </div>
                </details>

                <div className="mt-4">
                  <RegistrationTeamsEditor
                    registrationId={submission.id}
                    title="Teams for this school"
                    variant="embedded"
                    onTeamsChanged={() => void load()}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <details className="group space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 [&::-webkit-details-marker]:hidden">
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-400 transition-transform duration-200 group-open:rotate-90"
            aria-hidden
          >
            ▸
          </span>
          Recently deleted
          {deletedRows.length > 0 ? (
            <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
              {deletedRows.length}
            </span>
          ) : null}
        </summary>
        <div className="space-y-3 border-t border-slate-100 pt-4">
          {trashError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
              {trashError}
            </p>
          ) : null}
          {deletedRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
              Nothing in the trash. Deleting a registration moves it here for
              30 days before it is removed permanently (teams go with it).
            </p>
          ) : (
            deletedRows.map((submission) => {
              const teacherName =
                payloadString(submission.payload, "teacherName") || "Teacher";
              const teacherEmail =
                payloadString(submission.payload, "teacherEmail") ||
                submission.submittedBy;
              const deletedAt = submission.deletedAt;
              return (
                <article
                  key={submission.id}
                  className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm ring-1 ring-amber-100/80"
                >
                  {deletedAt ? (
                    <p className="mb-3 rounded-lg border border-amber-200 bg-amber-100/80 px-3 py-2 text-xs font-medium text-amber-950">
                      Permanently removed in ~{daysUntilRegistrationPurge(deletedAt)}{" "}
                      day(s), or restore to the main queue, or delete forever.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-black tracking-tight text-slate-900">
                        {submission.schoolName}
                      </h3>
                      <p className="mt-1 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700">
                          {teacherName}
                        </span>
                        <span className="text-slate-400"> · </span>
                        <span>{teacherEmail}</span>
                      </p>
                      {deletedAt ? (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Removed{" "}
                          {new Date(deletedAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => {
                          setTrashError(null);
                          void handleRestoreRegistration(submission.id);
                        }}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        disabled={actionBusy}
                        onClick={() => {
                          setActionError(null);
                          setPurgeForeverModalId(submission.id);
                        }}
                        className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 transition hover:bg-rose-50 disabled:opacity-50"
                      >
                        Delete forever
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </details>

      <AdminModal
        open={Boolean(moveModalId)}
        title="Move registration to another event"
        description="Teams and form answers stay with this registration. The teacher must not already have a registration on the destination event."
        onClose={() => {
          if (actionBusy) return;
          setMoveModalId(null);
          setMoveTargetEventId("");
          setActionError(null);
        }}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => {
                setMoveModalId(null);
                setMoveTargetEventId("");
                setActionError(null);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                actionBusy ||
                !moveModalId ||
                moveTargetOptions.length === 0 ||
                !moveTargetEventId
              }
              onClick={() =>
                moveModalId && void handleMoveRegistration(moveModalId)
              }
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {actionBusy ? "Moving…" : "Move registration"}
            </button>
          </div>
        }
      >
        {moveTargetOptions.length === 0 ? (
          <p className="text-sm text-slate-600">
            There are no other events to move this registration to.
          </p>
        ) : (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Destination event
            </span>
            <select
              value={moveTargetEventId}
              onChange={(e) => setMoveTargetEventId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {moveTargetOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {actionError && moveModalId ? (
          <p className="mt-3 text-sm font-medium text-rose-700">
            {actionError}
          </p>
        ) : null}
      </AdminModal>

      <AdminModal
        open={Boolean(deleteModalId)}
        title="Delete registration"
        description="Moves this teacher’s registration (and teams) out of the main queue into Recently deleted. It will be permanently removed after about 30 days, or you can delete forever from there."
        onClose={() => {
          if (actionBusy) return;
          setDeleteModalId(null);
          setActionError(null);
        }}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => {
                setDeleteModalId(null);
                setActionError(null);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionBusy || !deleteModalId}
              onClick={() =>
                deleteModalId && void handleDeleteRegistration(deleteModalId)
              }
              className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:opacity-60"
            >
              {actionBusy ? "Deleting…" : "Move to recently deleted"}
            </button>
          </div>
        }
      >
        {actionError && deleteModalId ? (
          <p className="text-sm font-medium text-rose-700">{actionError}</p>
        ) : null}
      </AdminModal>

      <AdminModal
        open={Boolean(purgeForeverModalId)}
        title="Delete registration forever"
        description="This permanently removes the registration and all teams from the database. This cannot be undone."
        onClose={() => {
          if (actionBusy) return;
          setPurgeForeverModalId(null);
          setActionError(null);
        }}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => {
                setPurgeForeverModalId(null);
                setActionError(null);
              }}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={actionBusy || !purgeForeverModalId}
              onClick={() =>
                purgeForeverModalId &&
                void handlePurgeRegistrationForever(purgeForeverModalId)
              }
              className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800 disabled:opacity-60"
            >
              {actionBusy ? "Removing…" : "Delete forever"}
            </button>
          </div>
        }
      >
        {actionError && purgeForeverModalId ? (
          <p className="text-sm font-medium text-rose-700">{actionError}</p>
        ) : null}
      </AdminModal>

      <AdminModal
        open={Boolean(adminModalSubmission && adminModalEdits)}
        title="School & class"
        description="Display name and optional class label. Admin notes are edited on the card."
        onClose={() => setAdminModalId(null)}
        footer={
          adminModalSubmission && adminModalEdits ? (
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setAdminModalId(null)}
                disabled={savingId === adminModalSubmission.id}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="admin-reg-edit-form"
                disabled={savingId === adminModalSubmission.id}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {savingId === adminModalSubmission.id ? "Saving…" : "Save"}
              </button>
            </div>
          ) : null
        }
      >
        {adminModalSubmission && adminModalEdits ? (
          <form
            id="admin-reg-edit-form"
            className="space-y-4"
            onSubmit={(ev: FormEvent) => {
              ev.preventDefault();
              void handleSaveSchoolClass(adminModalSubmission.id);
            }}
          >
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                School name
              </span>
              <input
                value={adminModalEdits.schoolName}
                onChange={(ev) =>
                  setEdits((cur) => ({
                    ...cur,
                    [adminModalSubmission.id]: {
                      ...adminModalEdits,
                      schoolName: ev.target.value,
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Class / grade band (optional)
              </span>
              <input
                value={adminModalEdits.className}
                onChange={(ev) =>
                  setEdits((cur) => ({
                    ...cur,
                    [adminModalSubmission.id]: {
                      ...adminModalEdits,
                      className: ev.target.value,
                    },
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </form>
        ) : null}
      </AdminModal>
    </div>
  );
}
