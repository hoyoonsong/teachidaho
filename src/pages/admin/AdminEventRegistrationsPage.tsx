import { useEffect, useState, type FormEvent } from "react";
import { AdminModal } from "../../components/admin/AdminModal";
import { PencilIconButton } from "../../components/ui/PencilIconButton";
import { RegistrationTeamsEditor } from "../../components/registration/RegistrationTeamsEditor";
import {
  listRegistrationsForEvent,
  updateRegistrationFields,
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

function shortId(id: string) {
  if (id.length <= 10) return id;
  return `${id.slice(0, 8)}…`;
}

export function AdminEventRegistrationsPage({
  eventId,
}: AdminEventRegistrationsPageProps) {
  const [rows, setRows] = useState<RegistrationDetailRecord[]>([]);
  const [edits, setEdits] = useState<
    Record<
      string,
      { schoolName: string; className: string; teacherNotes: string }
    >
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);
  const [adminModalId, setAdminModalId] = useState<string | null>(null);

  async function load() {
    const next = await listRegistrationsForEvent(eventId);
    setRows(next);
    const initial: typeof edits = {};
    for (const r of next) {
      initial[r.id] = {
        schoolName: r.schoolName,
        className: r.className ?? "",
        teacherNotes: r.teacherNotes ?? "",
      };
    }
    setEdits(initial);
  }

  useEffect(() => {
    void load();
  }, [eventId]);

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

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No registrations for this event yet.
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
                    <span className="text-slate-900">{submission.schoolName}</span>
                    <span className="mx-2 font-medium text-slate-300">—</span>
                    <span className="text-slate-800">{teacherName}</span>
                  </h3>
                  <PencilIconButton
                    onClick={() => setAdminModalId(submission.id)}
                    label={`Edit school / class for ${submission.schoolName}`}
                  />
                </div>

                <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 text-sm">
                  <summary className="cursor-pointer select-none px-3 py-2.5 font-semibold text-slate-700 hover:bg-slate-100/80">
                    Registration details
                  </summary>
                  <div className="space-y-3 border-t border-slate-200/80 px-3 py-3 text-slate-600">
                    <p className="text-xs leading-relaxed text-slate-500">
                      <span className="font-semibold text-slate-600">
                        Account ID:
                      </span>{" "}
                      <code className="rounded bg-white px-1 py-0.5 font-mono text-[11px] text-slate-800 ring-1 ring-slate-200">
                        {shortId(submission.teacherId)}
                      </code>{" "}
                      — distinguishes teachers and survives school renames.
                    </p>
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
                    <details className="rounded-lg bg-white ring-1 ring-slate-200/80">
                      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-600">
                        Raw form JSON
                      </summary>
                      <pre className="max-h-40 overflow-auto border-t border-slate-100 p-2 text-[10px] text-slate-600">
                        {JSON.stringify(submission.payload, null, 2)}
                      </pre>
                    </details>
                  </div>
                </details>

                <div className="mt-3 rounded-lg border border-violet-200 bg-violet-50/90 px-3 py-2.5 ring-1 ring-violet-100">
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
                        savingNotesId === submission.id || patch === undefined
                      }
                      onClick={() => void handleSaveAdminNotes(submission.id)}
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
