import { useCallback, useEffect, useMemo, useState } from "react";
import { DynamicForm } from "../components/forms/DynamicForm";
import { RegistrationTeamsEditor } from "../components/registration/RegistrationTeamsEditor";
import { useAuth } from "../hooks/useAuth";
import {
  ensureTeacherRegistrationDraft,
  getRegistrationFormForEvent,
  getTeacherRegistrationSnapshot,
  listActiveEvents,
  submitForm,
  type EventRecord,
  type FormDefinitionRecord,
  type TeacherRegistrationSnapshot,
} from "../lib/appDataStore";
import type { FormSubmissionPayload } from "../types/forms";

type ParticipantsRegisterPageProps = {
  onNavigate?: (to: string) => void;
};

export function ParticipantsRegisterPage({
  onNavigate,
}: ParticipantsRegisterPageProps = {}) {
  const params = new URLSearchParams(window.location.search);
  const { role, email, displayName } = useAuth();
  const hasTeacherAccess = role === "teacher" || role === "admin";
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    params.get("eventId") ?? "",
  );
  const [formDefinition, setFormDefinition] =
    useState<FormDefinitionRecord | null>(null);
  /** True briefly after a successful save so the status banner can say “saved” until they edit again. */
  const [recentlySaved, setRecentlySaved] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(
    null,
  );
  const [regSnapshot, setRegSnapshot] =
    useState<TeacherRegistrationSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  /** Bumped with registration snapshot refresh (Done editing / after save) so teams reload in the same beat—no extra polling. */
  const [teamsResyncToken, setTeamsResyncToken] = useState(0);
  /** When registration is submitted/approved, false = view-only until user clicks Edit. */
  const [editingRegistration, setEditingRegistration] = useState(true);

  const teacherPrefillIfEmpty = useMemo(
    () => ({
      teacherEmail: email?.trim() || undefined,
      teacherName: displayName?.trim() || undefined,
    }),
    [email, displayName],
  );

  const loadRegistrationSnapshot = useCallback(
    async (eventId: string, options?: { resyncTeams?: boolean }) => {
      setSnapshotLoading(true);
      try {
        const snap = await getTeacherRegistrationSnapshot(eventId);
        setRegSnapshot(snap);
        const submitted =
          snap &&
          (snap.status === "submitted" ||
            snap.status === "approved" ||
            snap.status === "rejected");
        setEditingRegistration(!submitted);
        if (options?.resyncTeams) {
          setTeamsResyncToken((t) => t + 1);
        }
      } finally {
        setSnapshotLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    async function loadEvents() {
      const nextEvents = await listActiveEvents();
      setEvents(nextEvents);
    }
    void loadEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    async function loadForm() {
      const nextForm = await getRegistrationFormForEvent(selectedEventId);
      setFormDefinition(nextForm);
    }
    void loadForm();
  }, [selectedEventId]);

  useEffect(() => {
    if (!hasTeacherAccess || !selectedEventId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setRegistrationError(null);
      const id = await ensureTeacherRegistrationDraft(selectedEventId);
      if (!cancelled) {
        if (id) setRegistrationId(id);
        else
          setRegistrationError(
            "Could not start a registration draft. Check your connection.",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasTeacherAccess, selectedEventId]);

  useEffect(() => {
    if (!hasTeacherAccess || !selectedEventId || !registrationId) {
      setRegSnapshot(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      if (!cancelled) await loadRegistrationSnapshot(selectedEventId);
    })();
    return () => {
      cancelled = true;
    };
  }, [
    hasTeacherAccess,
    selectedEventId,
    registrationId,
    loadRegistrationSnapshot,
  ]);

  const isFiled =
    regSnapshot &&
    (regSnapshot.status === "submitted" ||
      regSnapshot.status === "approved" ||
      regSnapshot.status === "rejected");
  const formAndTeamsLocked = Boolean(isFiled && !editingRegistration);

  async function handleSubmit(values: FormSubmissionPayload) {
    if (!formDefinition || !selectedEventId) return;
    await submitForm({
      formDefinitionId: formDefinition.id,
      eventId: selectedEventId || null,
      submittedBy: email ?? "unknown@teachidaho.local",
      payload: values,
    });
    setRecentlySaved(true);
    await loadRegistrationSnapshot(selectedEventId, { resyncTeams: true });
    setEditingRegistration(false);
  }

  const formInitialValues = regSnapshot?.payload;

  return (
    <main>
      <section className="bg-slate-50 py-10">
        <div className="mx-auto w-[min(94vw,1500px)] px-6">
          {!hasTeacherAccess && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="text-2xl font-bold tracking-tight text-amber-900">
                Teacher access required
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-amber-900/90">
                The register page is restricted to authenticated teacher/admin
                accounts.
              </p>
              <a
                href="/login?redirectTo=%2Fparticipants%2Fregister"
                className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Go to login
              </a>
            </div>
          )}

          {hasTeacherAccess && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
                Participants
              </p>
              <h1 className="mt-2 text-[clamp(2rem,2.8vw,2.4rem)] font-black tracking-tight text-slate-900">
                Registration
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600">
                Choose an event, add your teams, then submit the form below.
                Your school details and consent are saved with the form. After
                you submit once, everything stays filled in—use{" "}
                <strong>Edit registration</strong> to change details or add
                teams. Browse event details and announcements from the{" "}
                {onNavigate ? (
                  <button
                    type="button"
                    onClick={() => onNavigate("/participants")}
                    className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
                  >
                    Participants hub
                  </button>
                ) : (
                  <a
                    href="/participants"
                    className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
                  >
                    Participants hub
                  </a>
                )}
                .
              </p>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Event
                <select
                  value={selectedEventId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSelectedEventId(nextId);
                    setRecentlySaved(false);
                    if (!nextId) {
                      setFormDefinition(null);
                      setRegistrationId(null);
                      setRegistrationError(null);
                      setRegSnapshot(null);
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">
                    {events.length === 0
                      ? "No events open for registration"
                      : "Select an event…"}
                  </option>
                  {events.map((eventItem) => (
                    <option key={eventItem.id} value={eventItem.id}>
                      {eventItem.name}
                    </option>
                  ))}
                </select>
              </label>

              {registrationError && (
                <p className="mt-3 text-sm text-amber-800">
                  {registrationError}
                </p>
              )}

              {!selectedEventId ? (
                <p className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Choose an event above to add teams and complete the
                  registration form.
                </p>
              ) : (
                <>
                  {isFiled ? (
                    <div
                      className={`mt-6 rounded-xl border-2 px-4 py-4 ${
                        editingRegistration
                          ? "border-slate-200 bg-slate-50"
                          : "border-emerald-200 bg-emerald-50/90"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <p
                            className={`text-sm font-bold ${
                              editingRegistration
                                ? "text-slate-900"
                                : "text-emerald-950"
                            }`}
                          >
                            {editingRegistration
                              ? "Editing registration"
                              : recentlySaved
                                ? "Registration saved"
                                : "Registration on file"}
                          </p>
                          {editingRegistration ? (
                            <p className="text-xs leading-relaxed text-slate-600">
                              School details, teams, and notes below can be
                              changed. Use <strong>Save updates</strong> on the
                              school form when you&apos;re finished, or{" "}
                              <strong>Done editing</strong> to lock everything
                              again without saving new form changes.
                            </p>
                          ) : (
                            <p className="text-xs leading-relaxed text-emerald-950/90">
                              {recentlySaved ? (
                                <span className="font-semibold text-emerald-900">
                                  Your latest changes are saved.{" "}
                                </span>
                              ) : null}
                              School details, teams, and notes are on file and
                              locked. Admins can review this in the
                              registrations queue. Choose{" "}
                              <strong>Edit registration</strong> to update the
                              form or manage teams.
                            </p>
                          )}
                        </div>
                        {editingRegistration ? (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRegistration(false);
                              void loadRegistrationSnapshot(selectedEventId, {
                                resyncTeams: true,
                              });
                            }}
                            className="shrink-0 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-100"
                          >
                            Done editing
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRegistration(true);
                              setRecentlySaved(false);
                            }}
                            className="shrink-0 rounded-xl bg-emerald-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm ring-2 ring-emerald-900/10 transition hover:bg-emerald-900"
                          >
                            Edit registration
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <RegistrationTeamsEditor
                      registrationId={registrationId}
                      title="Your teams"
                      readOnly={formAndTeamsLocked}
                      hideReadOnlyNotice={formAndTeamsLocked}
                      resyncToken={teamsResyncToken}
                    />
                  </div>
                  {formDefinition && (
                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900">
                          School &amp; teacher details
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                          Notes and consent follow your contact information.
                        </p>
                      </div>
                      {snapshotLoading ? (
                        <p className="mt-4 text-sm text-slate-500">
                          Loading your saved answers…
                        </p>
                      ) : (
                        <div
                          className={
                            formAndTeamsLocked
                              ? "mt-4 rounded-lg bg-slate-50/80 p-3 ring-1 ring-slate-200/80"
                              : "mt-4"
                          }
                        >
                          <DynamicForm
                            definition={formDefinition}
                            initialValues={formInitialValues}
                            prefillIfEmpty={teacherPrefillIfEmpty}
                            disabled={formAndTeamsLocked}
                            submitLabel={
                              isFiled ? "Save updates" : "Submit registration"
                            }
                            onSubmit={handleSubmit}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
