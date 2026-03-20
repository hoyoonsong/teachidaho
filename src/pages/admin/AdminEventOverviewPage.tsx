import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  getEventById,
  updateEventDetails,
  type EventRecord,
  type EventStatus,
} from "../../lib/appDataStore";

const EVENT_STATUSES: EventStatus[] = [
  "draft",
  "published",
  "active",
  "closed",
  "archived",
];

function formatDisplayDate(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return value;
}

type AdminEventOverviewPageProps = {
  eventId: string;
  onSaved: () => void;
};

export function AdminEventOverviewPage({ eventId, onSaved }: AdminEventOverviewPageProps) {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [status, setStatus] = useState<EventStatus>("draft");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const row = await getEventById(eventId);
    setEvent(row);
    if (row) {
      setName(row.name);
      setEventDate(row.eventDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? row.eventDate);
      setLocation(row.location === "TBD" ? "" : row.location);
      setRegistrationDeadline(
        row.registrationDeadline.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ??
          row.registrationDeadline,
      );
      setAdditionalInfo(row.additionalInfo ?? "");
      setStatus(row.status);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await updateEventDetails(eventId, {
        name: name.trim(),
        additionalInfo: additionalInfo.trim(),
        location: location.trim() || "TBD",
        eventDate,
        registrationDeadline,
        status,
      });
      if (updated) {
        setEvent(updated);
        setMessage("Saved.");
        onSaved();
      } else {
        setError("Could not save (offline or unavailable).");
      }
    } catch (err) {
      console.warn(err);
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-600">Loading overview…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
        Event not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Overview</h1>
        <p className="mt-1 text-sm text-slate-600">
          Bird&apos;s-eye view of this event. Edit details below — changes apply everywhere
          this event appears.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Event date
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatDisplayDate(event.eventDate)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Location
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{event.location}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Registration deadline
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {formatDisplayDate(event.registrationDeadline)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Status
          </p>
          <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
            {event.status}
          </p>
        </div>
      </div>

      {event.additionalInfo ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Additional info
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{event.additionalInfo}</p>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Edit event</h2>
        <p className="mt-1 text-sm text-slate-600">
          Update name, schedule, location, registration deadline, visibility status, and notes.
        </p>

        {message && (
          <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p>
        )}
        {error && <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>}

        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Event name *
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
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
              value={
                registrationDeadline.match(/^\d{4}-\d{2}-\d{2}/)
                  ? registrationDeadline.slice(0, 10)
                  : registrationDeadline
              }
              onChange={(e) => setRegistrationDeadline(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Location *
            </span>
            <input
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, venue, or address"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Status
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Additional info (optional)
            </span>
            <textarea
              rows={4}
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              placeholder="Shown to teachers on the Participants page when present."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
