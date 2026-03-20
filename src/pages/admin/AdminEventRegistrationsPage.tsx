import { useEffect, useState, type FormEvent } from "react";
import { AdminModal } from "../../components/admin/AdminModal";
import { PencilIconButton } from "../../components/ui/PencilIconButton";
import { RegistrationTeamsEditor } from "../../components/registration/RegistrationTeamsEditor";
import {
  listRegistrationsForEvent,
  updateRegistrationFields,
  updateSubmissionStatus,
  type RegistrationDetailRecord,
  type SubmissionStatus,
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

function statusPillClass(active: boolean) {
  return active
    ? "bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-1"
    : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50";
}

export function AdminEventRegistrationsPage({ eventId }: AdminEventRegistrationsPageProps) {
  const [rows, setRows] = useState<RegistrationDetailRecord[]>([]);
  const [edits, setEdits] = useState<
    Record<string, { schoolName: string; className: string; teacherNotes: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
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

  async function handleSaveAdminFields(registrationId: string) {
    const patch = edits[registrationId];
    if (!patch) return;
    setSavingId(registrationId);
    try {
      await updateRegistrationFields(registrationId, {
        school_name: patch.schoolName,
        class_name: patch.className.trim() ? patch.className : null,
        teacher_notes: patch.teacherNotes.trim() ? patch.teacherNotes : null,
      });
      await load();
      setAdminModalId(null);
    } finally {
      setSavingId(null);
    }
  }

  async function handleStatusChange(submissionId: string, status: SubmissionStatus) {
    await updateSubmissionStatus(submissionId, status);
    await load();
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
          Each card is one registration: school and teacher are highlighted; contact and review
          details stay secondary. Teams and notes from the teacher sit together in the same card.
        </p>
      </div>

      {rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No registrations for this event yet.
        </div>
      )}

      <div className="space-y-6">
        {rows.map((submission) => {
          const teacherName =
            payloadString(submission.payload, "teacherName") || "Teacher";
          const teacherEmail =
            payloadString(submission.payload, "teacherEmail") || submission.submittedBy;
          const formNotes = payloadString(submission.payload, "notes");
          const submittedAt = new Date(submission.createdAt).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          });

          return (
            <article
              key={submission.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100"
            >
              <div className="border-l-4 border-l-emerald-600 px-5 pb-5 pt-6 sm:px-7">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      School
                    </p>
                    <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                      {submission.schoolName}
                    </h3>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Teacher
                    </p>
                    <p className="mt-0.5 text-xl font-bold text-slate-800 sm:text-2xl">
                      {teacherName}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-600">{teacherEmail}</span>
                      <span className="hidden text-slate-300 sm:inline" aria-hidden>
                        ·
                      </span>
                      <span>Submitted {submittedAt}</span>
                      <span className="hidden text-slate-300 sm:inline" aria-hidden>
                        ·
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                          submission.status === "accepted"
                            ? "bg-emerald-100 text-emerald-900"
                            : submission.status === "rejected"
                              ? "bg-rose-100 text-rose-900"
                              : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {submission.status === "accepted"
                          ? "Accepted"
                          : submission.status === "rejected"
                            ? "Rejected"
                            : "Pending"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(["pending", "accepted", "rejected"] as SubmissionStatus[]).map(
                        (status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => void handleStatusChange(submission.id, status)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${statusPillClass(
                              submission.status === status,
                            )}`}
                          >
                            {status}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  <PencilIconButton
                    onClick={() => setAdminModalId(submission.id)}
                    label={`Edit registration record for ${submission.schoolName}`}
                  />
                </div>

                {formNotes ? (
                  <div className="mt-6 rounded-xl bg-slate-50/90 px-4 py-3 ring-1 ring-slate-200/80">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Teacher notes (from form)
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{formNotes}</p>
                  </div>
                ) : null}

                {submission.teacherNotes?.trim() ? (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Admin notes
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{submission.teacherNotes}</p>
                  </div>
                ) : null}

                <div className="mt-6">
                  <RegistrationTeamsEditor
                    registrationId={submission.id}
                    title="Teams for this school"
                    variant="embedded"
                    onTeamsChanged={() => void load()}
                  />
                </div>

                <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-slate-600">
                    Raw submitted form (JSON)
                  </summary>
                  <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-white p-3 text-[11px] text-slate-600 ring-1 ring-slate-200">
                    {JSON.stringify(submission.payload, null, 2)}
                  </pre>
                </details>
              </div>
            </article>
          );
        })}
      </div>

      <AdminModal
        open={Boolean(adminModalSubmission && adminModalEdits)}
        title="Edit registration record"
        description="School display name, optional class label, and internal admin notes."
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
              void handleSaveAdminFields(adminModalSubmission.id);
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
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Admin notes (internal)
              </span>
              <textarea
                rows={4}
                value={adminModalEdits.teacherNotes}
                onChange={(ev) =>
                  setEdits((cur) => ({
                    ...cur,
                    [adminModalSubmission.id]: {
                      ...adminModalEdits,
                      teacherNotes: ev.target.value,
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
