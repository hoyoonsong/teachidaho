import { useEffect, useState } from "react";
import { DynamicForm } from "../components/forms/DynamicForm";
import { useAuth } from "../hooks/useAuth";

type ParticipantsRegisterPageProps = {
  onNavigate?: (to: string) => void;
};
import {
  getRegistrationFormForEvent,
  listActiveEvents,
  submitForm,
  type EventRecord,
  type FormDefinitionRecord,
} from "../lib/appDataStore";
import type { FormSubmissionPayload } from "../types/forms";

export function ParticipantsRegisterPage({
  onNavigate,
}: ParticipantsRegisterPageProps = {}) {
  const params = new URLSearchParams(window.location.search);
  const { role, email } = useAuth();
  const hasTeacherAccess = role === "teacher" || role === "admin";
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(
    params.get("eventId") ?? "",
  );
  const [formDefinition, setFormDefinition] =
    useState<FormDefinitionRecord | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      const nextEvents = await listActiveEvents();
      setEvents(nextEvents);
      if (!selectedEventId && nextEvents.length > 0) {
        setSelectedEventId(nextEvents[0].id);
      }
    }
    loadEvents();
  }, [selectedEventId]);

  useEffect(() => {
    async function loadForm() {
      const nextForm = await getRegistrationFormForEvent(
        selectedEventId || null,
      );
      setFormDefinition(nextForm);
    }
    loadForm();
  }, [selectedEventId]);

  async function handleSubmit(values: FormSubmissionPayload) {
    if (!formDefinition) return;
    await submitForm({
      formDefinitionId: formDefinition.id,
      eventId: selectedEventId || null,
      submittedBy: email ?? "unknown@teachidaho.local",
      payload: values,
    });
    setSuccessMessage(
      "Registration submitted. Admin can now review it in the registrations queue.",
    );
  }

  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-[min(94vw,1500px)] px-6 py-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            Participants
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Registration
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
            Choose an event below and submit the registration form. Browse event details and
            announcements from the{" "}
            {onNavigate ? (
              <button
                type="button"
                onClick={() => onNavigate("/participants")}
                className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
              >
                Participants
              </button>
            ) : (
              <a
                href="/participants"
                className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
              >
                Participants
              </a>
            )}{" "}
            hub.
          </p>
        </div>
      </section>

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
              <h2 className="text-[clamp(2rem,2.8vw,2.4rem)] font-bold tracking-tight text-slate-900">
                Registration Form Preview
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                This form is driven by JSON schema and stores responses as JSON
                payloads, so form versions are reproducible across events.
              </p>
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Event
                <select
                  value={selectedEventId}
                  onChange={(event) => setSelectedEventId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {events.map((eventItem) => (
                    <option key={eventItem.id} value={eventItem.id}>
                      {eventItem.name}
                    </option>
                  ))}
                </select>
              </label>
              {successMessage && (
                <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </p>
              )}
              {formDefinition && (
                <div className="mt-5">
                  <DynamicForm
                    definition={formDefinition}
                    submitLabel="Submit registration"
                    onSubmit={handleSubmit}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
