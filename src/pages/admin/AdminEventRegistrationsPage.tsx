import { useEffect, useState } from "react";
import {
  listRegistrationsForEvent,
  updateRegistrationFields,
  updateSubmissionStatus,
  type RegistrationDetailRecord,
  type SubmissionStatus,
} from "../../lib/appDataStore";

type AdminEventRegistrationsPageProps = {
  eventId: string;
};

export function AdminEventRegistrationsPage({ eventId }: AdminEventRegistrationsPageProps) {
  const [rows, setRows] = useState<RegistrationDetailRecord[]>([]);
  const [edits, setEdits] = useState<
    Record<string, { schoolName: string; className: string; teacherNotes: string }>
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);

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

  async function handleSave(registrationId: string) {
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
    } finally {
      setSavingId(null);
    }
  }

  async function handleStatusChange(submissionId: string, status: SubmissionStatus) {
    await updateSubmissionStatus(submissionId, status);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Registrations
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Teachers who registered for this event. Update school details or notes if
          needed, and set review status.
        </p>
      </div>
      {rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No registrations for this event yet.
        </div>
      )}
      <div className="space-y-3">
        {rows.map((submission) => {
          const e = edits[submission.id];
          return (
            <article
              key={submission.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {submission.submittedBy}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {new Date(submission.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {(["pending", "accepted", "rejected"] as SubmissionStatus[]).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusChange(submission.id, status)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                          submission.status === status
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {status}
                      </button>
                    ),
                  )}
                </div>
              </div>
              {e && (
                <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                      School name
                    </span>
                    <input
                      value={e.schoolName}
                      onChange={(ev) =>
                        setEdits((cur) => ({
                          ...cur,
                          [submission.id]: { ...e, schoolName: ev.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Class / grade band
                    </span>
                    <input
                      value={e.className}
                      onChange={(ev) =>
                        setEdits((cur) => ({
                          ...cur,
                          [submission.id]: { ...e, className: ev.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Admin notes
                    </span>
                    <textarea
                      rows={2}
                      value={e.teacherNotes}
                      onChange={(ev) =>
                        setEdits((cur) => ({
                          ...cur,
                          [submission.id]: { ...e, teacherNotes: ev.target.value },
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => void handleSave(submission.id)}
                      disabled={savingId === submission.id}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                    >
                      {savingId === submission.id ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>
              )}
              <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  View submitted form data
                </summary>
                <pre className="mt-2 overflow-auto text-xs text-slate-700">
                  {JSON.stringify(submission.payload, null, 2)}
                </pre>
              </details>
            </article>
          );
        })}
      </div>
    </div>
  );
}
