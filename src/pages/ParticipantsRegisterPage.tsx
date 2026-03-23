import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DynamicForm } from "../components/forms/DynamicForm";
import { RegistrationTeamsEditor } from "../components/registration/RegistrationTeamsEditor";
import { useAuth } from "../hooks/useAuth";
import {
  ensureTeacherRegistrationDraft,
  getRegistrationFormForEvent,
  getTeacherRegistrationSnapshot,
  listActiveEventsDetailed,
  listTeacherFiledRegistrationEventIds,
  submitForm,
  type EventRecord,
  type FormDefinitionRecord,
  type TeacherRegistrationSnapshot,
} from "../lib/appDataStore";
import {
  formatRegistrationDueLine,
  isRegistrationDeadlinePassed,
} from "../lib/registrationDeadline";
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
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsLoadError, setEventsLoadError] = useState<string | null>(null);
  /** Submitted / approved / rejected only — drafts do not extend past registration deadline. */
  const [filedRegistrationEventIds, setFiledRegistrationEventIds] = useState<
    Set<string>
  >(() => new Set());
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
  const [eventMenuOpen, setEventMenuOpen] = useState(false);
  const eventPickerRef = useRef<HTMLDivElement>(null);

  const teacherPrefillIfEmpty = useMemo(
    () => ({
      teacherEmail: email?.trim() || undefined,
      teacherName: displayName?.trim() || undefined,
    }),
    [email, displayName],
  );

  /** Reload snapshot from server; optional quiet mode avoids the school-form loading overlay. */
  const loadRegistrationSnapshot = useCallback(
    async (
      eventId: string,
      options?: { resyncTeams?: boolean; quiet?: boolean },
    ) => {
      if (!options?.quiet) {
        setSnapshotLoading(true);
      }
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
        if (!options?.quiet) {
          setSnapshotLoading(false);
        }
      }
    },
    [],
  );

  /** One round-trip: public event catalog + filed ids (used on mount/retry). */
  const loadTeacherBootstrap = useCallback(async () => {
    setEventsLoading(true);
    setEventsLoadError(null);
    try {
      const [catalog, ids] = await Promise.all([
        listActiveEventsDetailed(),
        listTeacherFiledRegistrationEventIds(),
      ]);
      setEvents(catalog.events);
      setEventsLoadError(catalog.error);
      setFiledRegistrationEventIds(new Set(ids));
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasTeacherAccess) {
      setEvents([]);
      setEventsLoadError(null);
      setFiledRegistrationEventIds(new Set());
      return;
    }
    void loadTeacherBootstrap();
  }, [hasTeacherAccess, loadTeacherBootstrap]);

  /** Open registration or past deadline but already submitted / approved / rejected. */
  const selectableEvents = useMemo(() => {
    return events.filter(
      (e) =>
        !isRegistrationDeadlinePassed(e.registrationDeadline) ||
        filedRegistrationEventIds.has(e.id),
    );
  }, [events, filedRegistrationEventIds]);

  const selectedEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) ?? null,
    [events, selectedEventId],
  );

  useEffect(() => {
    if (!selectedEventId) return;
    const inCatalog = events.some((e) => e.id === selectedEventId);
    const allowed =
      inCatalog && selectableEvents.some((e) => e.id === selectedEventId);
    if (allowed) return;
    setSelectedEventId("");
    setFormDefinition(null);
    setRegistrationId(null);
    setRegistrationError(null);
    setRegSnapshot(null);
  }, [selectedEventId, events, selectableEvents]);

  useEffect(() => {
    setEventMenuOpen(false);
  }, [selectedEventId]);

  useEffect(() => {
    if (!eventMenuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setEventMenuOpen(false);
    }
    function onPointer(e: Event) {
      const el = eventPickerRef.current;
      const t = e.target;
      if (el && t instanceof Node && !el.contains(t)) setEventMenuOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [eventMenuOpen]);

  /**
   * Form schema + draft row + snapshot in two waves: (form ∥ ensure) then snapshot.
   * Skips redundant listTeacherFiledRegistrationEventIds here (unchanged by draft ensure).
   */
  useEffect(() => {
    if (!hasTeacherAccess || !selectedEventId) {
      if (!selectedEventId) {
        setFormDefinition(null);
        setRegistrationId(null);
        setRegSnapshot(null);
        setRegistrationError(null);
      }
      return;
    }
    const ac = new AbortController();
    void (async () => {
      setSnapshotLoading(true);
      setRegistrationError(null);
      try {
        const [formDef, draftId] = await Promise.all([
          getRegistrationFormForEvent(selectedEventId),
          ensureTeacherRegistrationDraft(selectedEventId),
        ]);
        if (ac.signal.aborted) return;
        setFormDefinition(formDef);
        if (!draftId) {
          setRegistrationId(null);
          setRegSnapshot(null);
          setRegistrationError(
            "Could not start a registration draft. Check your connection.",
          );
          return;
        }
        setRegistrationId(draftId);
        const snap = await getTeacherRegistrationSnapshot(selectedEventId);
        if (ac.signal.aborted) return;
        setRegSnapshot(snap);
        const submitted =
          snap &&
          (snap.status === "submitted" ||
            snap.status === "approved" ||
            snap.status === "rejected");
        setEditingRegistration(!submitted);
      } catch (err) {
        if (!ac.signal.aborted) {
          console.warn(err);
          setRegistrationError(
            "Could not load registration. Check your connection.",
          );
          setRegSnapshot(null);
        }
      } finally {
        if (!ac.signal.aborted) {
          setSnapshotLoading(false);
        }
      }
    })();
    return () => ac.abort();
  }, [hasTeacherAccess, selectedEventId]);

  const isFiled =
    regSnapshot &&
    (regSnapshot.status === "submitted" ||
      regSnapshot.status === "approved" ||
      regSnapshot.status === "rejected");

  const hasFiledRegistration = useMemo(() => {
    if (!selectedEventId) return false;
    if (filedRegistrationEventIds.has(selectedEventId)) return true;
    return Boolean(
      regSnapshot &&
        (regSnapshot.status === "submitted" ||
          regSnapshot.status === "approved" ||
          regSnapshot.status === "rejected"),
    );
  }, [selectedEventId, filedRegistrationEventIds, regSnapshot]);

  const registrationPastDeadlineBlocked = Boolean(
    selectedEvent &&
      isRegistrationDeadlinePassed(selectedEvent.registrationDeadline) &&
      !hasFiledRegistration,
  );

  const formLocked = Boolean(isFiled && !editingRegistration);
  const formInteractionLocked =
    formLocked || registrationPastDeadlineBlocked;
  /** Teams follow the same lock as the school form: filed + not editing, or past deadline without on file. */
  const teamsInteractionLocked = formInteractionLocked;

  async function handleSubmit(values: FormSubmissionPayload) {
    if (!formDefinition || !selectedEventId) return;
    if (registrationPastDeadlineBlocked && !isFiled) return;
    if (isFiled && !editingRegistration) return;
    await submitForm({
      formDefinitionId: formDefinition.id,
      eventId: selectedEventId || null,
      submittedBy: email ?? "unknown@teachidaho.local",
      payload: values,
    });
    setRecentlySaved(true);
    setEditingRegistration(false);
    const [snap, ids] = await Promise.all([
      getTeacherRegistrationSnapshot(selectedEventId),
      listTeacherFiledRegistrationEventIds(),
    ]);
    setRegSnapshot(snap);
    setFiledRegistrationEventIds(new Set(ids));
    setTeamsResyncToken((t) => t + 1);
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
                Only events that are still open for new registration appear
                here, plus any past-deadline event where you are already{" "}
                <strong>(registered)</strong>. After you submit, use{" "}
                <strong>Edit registration</strong> to change school details,
                teacher information, or teams. Browse event details and
                announcements from the{" "}
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
              {eventsLoadError ? (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <p className="font-semibold">Could not load the event list</p>
                  <p className="mt-1 text-amber-900/90">{eventsLoadError}</p>
                  <button
                    type="button"
                    onClick={() => void loadTeacherBootstrap()}
                    disabled={eventsLoading}
                    className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {eventsLoading ? "Retrying…" : "Try again"}
                  </button>
                </div>
              ) : null}
              <div className="mt-4">
                <label
                  htmlFor="participants-register-event-button"
                  className="block text-sm font-medium text-slate-700"
                >
                  Event
                </label>
                <div ref={eventPickerRef} className="relative mt-1">
                  <button
                    type="button"
                    id="participants-register-event-button"
                    aria-expanded={eventMenuOpen}
                    aria-haspopup="listbox"
                    disabled={eventsLoading || selectableEvents.length === 0}
                    onClick={() => setEventMenuOpen((open) => !open)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="min-w-0">
                      {eventsLoading ? (
                        <span className="text-slate-500">Loading events…</span>
                      ) : selectedEvent ? (
                        <>
                          <span className="font-medium text-slate-900">
                            {selectedEvent.name}
                          </span>
                          {filedRegistrationEventIds.has(selectedEvent.id) ? (
                            <span className="ml-1.5 font-semibold text-violet-700">
                              (registered)
                            </span>
                          ) : null}
                        </>
                      ) : events.length === 0 ? (
                        <span className="text-slate-500">
                          No public events are available to register for yet
                        </span>
                      ) : selectableEvents.length === 0 ? (
                        <span className="text-slate-500">
                          No events open for registration — deadlines may have
                          passed
                        </span>
                      ) : (
                        <span className="text-slate-500">Select an event…</span>
                      )}
                    </span>
                    <span
                      className="shrink-0 text-xs text-slate-400"
                      aria-hidden
                    >
                      {eventMenuOpen ? "▲" : "▼"}
                    </span>
                  </button>
                  {eventMenuOpen && selectableEvents.length > 0 ? (
                    <ul
                      role="listbox"
                      aria-labelledby="participants-register-event-button"
                      className="absolute z-40 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5"
                    >
                      {selectableEvents.map((eventItem) => {
                        const passed = isRegistrationDeadlinePassed(
                          eventItem.registrationDeadline,
                        );
                        const onFile = filedRegistrationEventIds.has(
                          eventItem.id,
                        );
                        const active = eventItem.id === selectedEventId;
                        return (
                          <li key={eventItem.id} role="presentation">
                            <button
                              type="button"
                              role="option"
                              aria-selected={active}
                              onMouseDown={(e) => {
                                e.preventDefault();
                              }}
                              onClick={() => {
                                setSelectedEventId(eventItem.id);
                                setRecentlySaved(false);
                                setEventMenuOpen(false);
                              }}
                              className={`flex w-full flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-2.5 text-left text-sm transition hover:brightness-[0.98] ${
                                passed
                                  ? "bg-amber-50 text-amber-950"
                                  : "bg-emerald-50 text-emerald-950"
                              } ${active ? "ring-2 ring-inset ring-slate-500" : ""}`}
                            >
                              <span className="font-medium">
                                {eventItem.name}
                              </span>
                              {onFile ? (
                                <span className="font-semibold text-violet-700">
                                  (registered)
                                </span>
                              ) : null}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              </div>

              {selectedEvent ? (
                <div
                  className={`mt-4 rounded-xl border px-4 py-4 ${
                    isRegistrationDeadlinePassed(
                      selectedEvent.registrationDeadline,
                    )
                      ? "border-amber-400 bg-amber-50"
                      : "border-emerald-300 bg-emerald-50"
                  }`}
                >
                  <p
                    className={`text-sm font-bold ${
                      isRegistrationDeadlinePassed(
                        selectedEvent.registrationDeadline,
                      )
                        ? "text-amber-950"
                        : "text-emerald-950"
                    }`}
                  >
                    {isRegistrationDeadlinePassed(
                      selectedEvent.registrationDeadline,
                    )
                      ? "Registration deadline has passed"
                      : "Registration open"}
                  </p>
                  <div className="mt-2 flex items-start gap-3">
                    <span
                      className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-white text-[10px] font-bold leading-tight ${
                        isRegistrationDeadlinePassed(
                          selectedEvent.registrationDeadline,
                        )
                          ? "border-amber-200 text-amber-900"
                          : "border-emerald-200 text-emerald-800"
                      }`}
                      aria-hidden
                    >
                      📅
                    </span>
                    <div className="min-w-0 text-sm text-slate-800">
                      <p className="font-medium">
                        {formatRegistrationDueLine(
                          selectedEvent.registrationDeadline,
                        )}
                      </p>
                      {isRegistrationDeadlinePassed(
                        selectedEvent.registrationDeadline,
                      ) && filedRegistrationEventIds.has(selectedEvent.id) ? (
                        <p className="mt-1 text-xs leading-relaxed text-amber-900/95">
                          You still have access because you already submitted a
                          registration for this event (or it was reviewed by an
                          admin).
                        </p>
                      ) : isRegistrationDeadlinePassed(
                          selectedEvent.registrationDeadline,
                        ) ? (
                        <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
                          New registrations are closed for this event.
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-emerald-900/85">
                          Complete your school details and teams below before
                          this date.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

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
                          : recentlySaved
                            ? "border-emerald-200 bg-emerald-50/90"
                            : "border-violet-300 bg-violet-50/95"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <p
                            className={`text-sm font-bold ${
                              editingRegistration
                                ? "text-slate-900"
                                : recentlySaved
                                  ? "text-emerald-950"
                                  : "text-violet-950"
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
                              School and teacher details and teams can be
                              changed below. Use <strong>Save updates</strong>{" "}
                              on the school form when you&apos;re finished, or{" "}
                              <strong>Done editing</strong> to lock everything
                              again without saving.
                            </p>
                          ) : (
                            <p
                              className={`text-xs leading-relaxed ${
                                recentlySaved
                                  ? "text-emerald-950/90"
                                  : "text-violet-950/90"
                              }`}
                            >
                              {recentlySaved ? (
                                <span className="font-semibold text-emerald-900">
                                  Your latest changes are saved.{" "}
                                </span>
                              ) : null}
                              School details, teams, and notes are on file and
                              locked. Choose <strong>Edit registration</strong>{" "}
                              to make changes. Admins review submissions in the
                              registrations queue.
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
                            className="shrink-0 rounded-xl bg-violet-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm ring-2 ring-violet-950/15 transition hover:bg-violet-900"
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
                      readOnly={teamsInteractionLocked}
                      readOnlyNotice={
                        registrationPastDeadlineBlocked
                          ? "Teams cannot be changed — the registration deadline has passed and you do not have a registration on file for this event."
                          : null
                      }
                      hideReadOnlyNotice={
                        teamsInteractionLocked &&
                        !registrationPastDeadlineBlocked
                      }
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
                            formInteractionLocked
                              ? "mt-4 rounded-lg bg-slate-50/80 p-3 ring-1 ring-slate-200/80"
                              : "mt-4"
                          }
                        >
                          <DynamicForm
                            definition={formDefinition}
                            initialValues={formInitialValues}
                            prefillIfEmpty={teacherPrefillIfEmpty}
                            disabled={formInteractionLocked}
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
