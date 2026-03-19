import { useEffect, useState } from "react";
import {
  createEvent,
  listEvents,
  updateEventStatus,
  type EventRecord,
  type EventStatus,
} from "../../lib/appDataStore";

type NewEventFormState = {
  name: string;
  eventDate: string;
  location: string;
  registrationDeadline: string;
  additionalInfo: string;
};

const initialForm: NewEventFormState = {
  name: "",
  eventDate: "",
  location: "",
  registrationDeadline: "",
  additionalInfo: "",
};

export function AdminEventsPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [form, setForm] = useState<NewEventFormState>(initialForm);

  async function loadEvents() {
    const nextEvents = await listEvents();
    setEvents(nextEvents);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  async function handleCreateEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createEvent({
      ...form,
      status: "draft",
    });
    setForm(initialForm);
    await loadEvents();
  }

  async function handleStatusChange(eventId: string, status: EventStatus) {
    await updateEventStatus(eventId, status);
    await loadEvents();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Events
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Create events and control active visibility on the Participants page.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Create event</h2>
        <p className="mt-1 text-sm text-slate-600">
          Fill the required fields below, then click Create Event.
        </p>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreateEvent}>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Event name *
            </span>
            <input
              required
              value={form.name ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="International Economic Summit 2027"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Event date *
            </span>
            <input
              required
              type="date"
              value={form.eventDate ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, eventDate: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Location *
            </span>
            <input
              required
              value={form.location ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, location: event.target.value }))
              }
              placeholder="Boise, Idaho"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Registration deadline *
            </span>
            <input
              required
              type="date"
              value={form.registrationDeadline ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  registrationDeadline: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Additional info (optional)
            </span>
            <textarea
              rows={3}
              value={form.additionalInfo ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, additionalInfo: event.target.value }))
              }
              placeholder="Any extra details teachers should know."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
      <div className="space-y-3">
        {events.map((event) => (
          <article
            key={event.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{event.name}</h3>
                {event.additionalInfo && (
                  <p className="mt-1 text-sm text-slate-600">{event.additionalInfo}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  {event.eventDate} • {event.location} • deadline{" "}
                  {event.registrationDeadline}
                </p>
              </div>
              <div className="flex gap-2">
                {(["draft", "active", "closed"] as EventStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusChange(event.id, status)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                      event.status === status
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
