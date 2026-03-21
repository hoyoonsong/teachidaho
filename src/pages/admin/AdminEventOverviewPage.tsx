import { useCallback, useEffect, useState, type FormEvent } from "react";
import { AdminModal } from "../../components/admin/AdminModal";
import { PencilIconButton } from "../../components/ui/PencilIconButton";
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

type ModalKey =
  | null
  | "name"
  | "eventDate"
  | "location"
  | "registrationDeadline"
  | "status"
  | "notes";

type AdminEventOverviewPageProps = {
  eventId: string;
  onSaved: () => void;
};

export function AdminEventOverviewPage({
  eventId,
  onSaved,
}: AdminEventOverviewPageProps) {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKey>(null);

  const [draftName, setDraftName] = useState("");
  const [draftEventDate, setDraftEventDate] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftRegistrationDeadline, setDraftRegistrationDeadline] =
    useState("");
  const [draftStatus, setDraftStatus] = useState<EventStatus>("draft");
  const [draftNotes, setDraftNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const row = await getEventById(eventId);
    setEvent(row);
    if (row) {
      setDraftName(row.name);
      setDraftEventDate(
        row.eventDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? row.eventDate,
      );
      setDraftLocation(row.location === "TBD" ? "" : row.location);
      setDraftRegistrationDeadline(
        row.registrationDeadline.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ??
          row.registrationDeadline,
      );
      setDraftNotes(row.additionalInfo ?? "");
      setDraftStatus(row.status);
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openModal(key: Exclude<ModalKey, null>) {
    if (!event) return;
    setDraftName(event.name);
    setDraftEventDate(
      event.eventDate.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? event.eventDate,
    );
    setDraftLocation(event.location === "TBD" ? "" : event.location);
    setDraftRegistrationDeadline(
      event.registrationDeadline.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ??
        event.registrationDeadline,
    );
    setDraftNotes(event.additionalInfo ?? "");
    setDraftStatus(event.status);
    setMessage(null);
    setError(null);
    setModal(key);
  }

  async function saveAndClose(patch: Parameters<typeof updateEventDetails>[1]) {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await updateEventDetails(eventId, patch);
      if (updated) {
        setEvent(updated);
        setMessage("Saved.");
        onSaved();
        setModal(null);
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

  function handleNameSubmit(e: FormEvent) {
    e.preventDefault();
    void saveAndClose({ name: draftName.trim() });
  }

  function handleEventDateSubmit(e: FormEvent) {
    e.preventDefault();
    void saveAndClose({ eventDate: draftEventDate });
  }

  function handleLocationSubmit(e: FormEvent) {
    e.preventDefault();
    void saveAndClose({ location: draftLocation.trim() || "TBD" });
  }

  function handleDeadlineSubmit(e: FormEvent) {
    e.preventDefault();
    void saveAndClose({ registrationDeadline: draftRegistrationDeadline });
  }

  function handleStatusSubmit(e: FormEvent) {
    e.preventDefault();
    void saveAndClose({ status: draftStatus });
  }

  function handleNotesSubmit(e: FormEvent) {
    e.preventDefault();
    void saveAndClose({ additionalInfo: draftNotes.trim() });
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-600">
          Loading overview…
        </p>
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

  function modalFooter(formId: string) {
    return (
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => setModal(null)}
          disabled={saving}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          form={formId}
          disabled={saving}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          {message}
        </p>
      )}
      {error && !modal && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="relative mt-6 rounded-2xl border border-slate-200 bg-slate-50/50 p-5 pr-24">
          <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
            <PencilIconButton
              onClick={() => openModal("name")}
              label="Edit event name"
            />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Event name
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {event.name}
          </h2>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative rounded-2xl border border-slate-200 bg-white p-5 pt-12 shadow-sm">
            <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
              <PencilIconButton
                onClick={() => openModal("eventDate")}
                label="Edit event date"
              />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Event date
            </p>
            <p className="mt-2 text-base font-bold text-slate-900">
              {formatDisplayDate(event.eventDate)}
            </p>
          </div>
          <div className="relative rounded-2xl border border-slate-200 bg-white p-5 pt-12 shadow-sm">
            <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
              <PencilIconButton
                onClick={() => openModal("location")}
                label="Edit location"
              />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Location
            </p>
            <p className="mt-2 text-base font-bold text-slate-900">
              {event.location}
            </p>
          </div>
          <div className="relative rounded-2xl border border-slate-200 bg-white p-5 pt-12 shadow-sm">
            <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
              <PencilIconButton
                onClick={() => openModal("registrationDeadline")}
                label="Edit registration deadline"
              />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Registration deadline
            </p>
            <p className="mt-2 text-base font-bold text-slate-900">
              {formatDisplayDate(event.registrationDeadline)}
            </p>
          </div>
          <div className="relative rounded-2xl border border-slate-200 bg-white p-5 pt-12 shadow-sm">
            <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
              <PencilIconButton
                onClick={() => openModal("status")}
                label="Edit status"
              />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Status
            </p>
            <p className="mt-2 text-base font-bold capitalize text-slate-900">
              {event.status}
            </p>
          </div>
        </div>

        <div className="relative mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 pr-24 shadow-sm">
          <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
            <PencilIconButton
              onClick={() => openModal("notes")}
              label="Edit additional info for participants"
            />
          </div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Additional info for participants
          </p>
          {event.additionalInfo?.trim() ? (
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {event.additionalInfo}
            </p>
          ) : (
            <p className="mt-2 text-sm italic text-slate-500">
              No extra notes yet — visible on the Participants hub when added.
            </p>
          )}
        </div>
      </div>

      <AdminModal
        open={modal === "name"}
        title="Edit event name"
        description="Shown in admin lists, participant pages, and links."
        onClose={() => setModal(null)}
        footer={modalFooter("overview-form-name")}
      >
        <form
          id="overview-form-name"
          className="space-y-4"
          onSubmit={handleNameSubmit}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Event name *
            </span>
            <input
              required
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          {error && modal === "name" && (
            <p className="text-sm font-medium text-rose-700">{error}</p>
          )}
        </form>
      </AdminModal>

      <AdminModal
        open={modal === "eventDate"}
        title="Edit event date"
        onClose={() => setModal(null)}
        footer={modalFooter("overview-form-date")}
      >
        <form
          id="overview-form-date"
          className="space-y-4"
          onSubmit={handleEventDateSubmit}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Event date *
            </span>
            <input
              required
              type="date"
              value={draftEventDate}
              onChange={(e) => setDraftEventDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          {error && modal === "eventDate" && (
            <p className="text-sm font-medium text-rose-700">{error}</p>
          )}
        </form>
      </AdminModal>

      <AdminModal
        open={modal === "location"}
        title="Edit location"
        onClose={() => setModal(null)}
        footer={modalFooter("overview-form-loc")}
      >
        <form
          id="overview-form-loc"
          className="space-y-4"
          onSubmit={handleLocationSubmit}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Location *
            </span>
            <input
              required
              value={draftLocation}
              onChange={(e) => setDraftLocation(e.target.value)}
              placeholder="City, venue, or address"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          {error && modal === "location" && (
            <p className="text-sm font-medium text-rose-700">{error}</p>
          )}
        </form>
      </AdminModal>

      <AdminModal
        open={modal === "registrationDeadline"}
        title="Edit registration deadline"
        onClose={() => setModal(null)}
        footer={modalFooter("overview-form-deadline")}
      >
        <form
          id="overview-form-deadline"
          className="space-y-4"
          onSubmit={handleDeadlineSubmit}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Registration deadline *
            </span>
            <input
              required
              type="date"
              value={
                draftRegistrationDeadline.match(/^\d{4}-\d{2}-\d{2}/)
                  ? draftRegistrationDeadline.slice(0, 10)
                  : draftRegistrationDeadline
              }
              onChange={(e) => setDraftRegistrationDeadline(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          {error && modal === "registrationDeadline" && (
            <p className="text-sm font-medium text-rose-700">{error}</p>
          )}
        </form>
      </AdminModal>

      <AdminModal
        open={modal === "status"}
        title="Edit status"
        description="Controls visibility and lifecycle for this event."
        onClose={() => setModal(null)}
        footer={modalFooter("overview-form-status")}
      >
        <form
          id="overview-form-status"
          className="space-y-4"
          onSubmit={handleStatusSubmit}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Status
            </span>
            <select
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value as EventStatus)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {EVENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          {error && modal === "status" && (
            <p className="text-sm font-medium text-rose-700">{error}</p>
          )}
        </form>
      </AdminModal>

      <AdminModal
        open={modal === "notes"}
        title="Edit additional info"
        description="Optional text shown to teachers on the Participants event pages."
        onClose={() => setModal(null)}
        footer={modalFooter("overview-form-notes")}
      >
        <form
          id="overview-form-notes"
          className="space-y-4"
          onSubmit={handleNotesSubmit}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Additional info
            </span>
            <textarea
              rows={5}
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="Parking, dress code, materials, etc."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          {error && modal === "notes" && (
            <p className="text-sm font-medium text-rose-700">{error}</p>
          )}
        </form>
      </AdminModal>
    </div>
  );
}
