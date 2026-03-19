import { useEffect, useState } from "react";
import {
  listFormSubmissions,
  updateSubmissionStatus,
  type FormSubmissionRecord,
  type SubmissionStatus,
} from "../../lib/appDataStore";

export function AdminRegistrationsPage() {
  const [submissions, setSubmissions] = useState<FormSubmissionRecord[]>([]);

  async function loadSubmissions() {
    const next = await listFormSubmissions();
    setSubmissions(next);
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function handleStatusChange(
    submissionId: string,
    status: SubmissionStatus,
  ) {
    await updateSubmissionStatus(submissionId, status);
    await loadSubmissions();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Registration Review
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Review teacher submissions and mark accepted submissions into event
          memberships.
        </p>
      </div>
      {submissions.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No submissions yet. Once teachers submit forms, they will appear here.
        </div>
      )}
      <div className="space-y-3">
        {submissions.map((submission) => (
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
            <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                View submitted payload
              </summary>
              <pre className="mt-2 overflow-auto text-xs text-slate-700">
                {JSON.stringify(submission.payload, null, 2)}
              </pre>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
