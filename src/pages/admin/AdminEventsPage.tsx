import { useEffect, useId, useMemo, useState } from "react";
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

type AdminEventsPageProps = {
  onNavigate: (to: string) => void;
};

function formatCardDate(value: string) {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return value;
}

function statusBadge(event: EventRecord) {
  switch (event.status) {
    case "active":
      return {
        label: "Active",
        className: "bg-emerald-100 text-emerald-800 ring-emerald-200/60",
      };
    case "published":
      return {
        label: "Public",
        className: "bg-sky-100 text-sky-800 ring-sky-200/60",
      };
    case "draft":
      return {
        label: "Draft",
        className: "bg-slate-100 text-slate-700 ring-slate-200/80",
      };
    case "closed":
      return {
        label: "Closed",
        className: "bg-amber-100 text-amber-900 ring-amber-200/70",
      };
    case "archived":
      return {
        label: "Archived",
        className: "bg-slate-200 text-slate-600 ring-slate-300/80",
      };
    default:
      return {
        label: event.status,
        className: "bg-slate-100 text-slate-700 ring-slate-200/80",
      };
  }
}

export function AdminEventsPage({ onNavigate }: AdminEventsPageProps) {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [form, setForm] = useState<NewEventFormState>(initialForm);
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const dialogTitleId = useId();

  async function loadEvents() {
    const nextEvents = await listEvents();
    setEvents(nextEvents);
  }

  useEffect(() => {
    let cancelled = false;
    void listEvents().then((next) => {
      if (!cancelled) setEvents(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!createOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCreateOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [createOpen]);

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) => {
      const blob =
        `${e.name} ${e.location} ${e.additionalInfo} ${e.eventDate}`.toLowerCase();
      return blob.includes(q);
    });
  }, [events, search]);

  async function handleCreateEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await createEvent({
      ...form,
      status: "draft",
    });
    setForm(initialForm);
    setCreateOpen(false);
    await loadEvents();
  }

  function closeModal() {
    setCreateOpen(false);
  }

  async function handleStatusChange(eventId: string, status: EventStatus) {
    await updateEventStatus(eventId, status);
    await loadEvents();
  }

  const gridClass =
    view === "grid"
      ? "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
      : "flex flex-col gap-4";

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
          Events
        </h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-white px-2.5 py-1 font-semibold text-slate-600 ring-1 ring-slate-200">
            {events.length} total
          </span>
          <span className="rounded-md bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
            {events.filter((e) => e.status === "active").length} active
          </span>
        </div>
      </div>

      {/* Compact hero — fixed height; content centered without overflow */}
      <button
        type="button"
        onClick={() => setCreateOpen(true)}
        className="group flex h-40 w-full shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-xl border-2 border-dashed border-gray-300 px-4 transition-all duration-200 hover:border-indigo-400 hover:bg-indigo-50/50 lg:h-48 lg:gap-2"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-700 text-2xl font-light leading-none text-white shadow-md ring-4 ring-red-700/[0.12] transition group-hover:scale-105 group-hover:bg-red-800 sm:h-12 sm:w-12 sm:text-3xl lg:h-14 lg:w-14">
          +
        </span>
        <span className="text-center text-base font-bold text-red-800 lg:text-lg">
          Create new event
        </span>
        <p className="max-w-sm px-1 text-center text-xs leading-snug text-slate-500 lg:text-sm">
          Start an event from scratch.
        </p>
      </button>

      {/* Toolbar: All events + search + view (reference layout) */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <h2 className="flex shrink-0 items-center gap-2 text-lg font-bold text-slate-900 md:text-xl">
            <span className="h-7 w-1 rounded-sm bg-slate-800" aria-hidden />
            All events
          </h2>
          <label className="relative block min-w-0 flex-1 max-w-xl">
            <span className="sr-only">Search events</span>
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
            />
          </label>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
          <div className="flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                view === "grid"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Grid
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                view === "list"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              List
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:text-sm"
          >
            + New
          </button>
        </div>
      </div>

      <p className="-mt-4 text-xs text-slate-500">
        {filteredEvents.length} of {events.length} shown
      </p>

      <div className={gridClass}>
        {filteredEvents.map((event) => {
          const badge = statusBadge(event);
          const desc = event.additionalInfo?.trim();
          const metaLine = `${formatCardDate(event.eventDate)} · ${event.location}`;

          return (
            <article
              key={event.id}
              className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100/80 transition hover:shadow-md ${
                view === "list" ? "lg:flex-row lg:items-start" : ""
              }`}
            >
              <button
                type="button"
                onClick={() => onNavigate(`/admin/events/${event.id}/overview`)}
                className={`relative flex flex-1 flex-col p-5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 md:p-6 ${
                  view === "list" ? "lg:min-w-0 lg:flex-1" : ""
                }`}
              >
                <span
                  className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${badge.className}`}
                >
                  {badge.label}
                </span>
                <h3 className="pr-24 text-base font-bold leading-snug tracking-tight text-slate-900 md:text-[1.05rem]">
                  {event.name}
                </h3>
                {desc ? (
                  <>
                    <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">
                      {desc}
                    </p>
                    <p className="mt-2 text-xs tabular-nums text-slate-400">
                      {metaLine}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">
                    {metaLine}
                  </p>
                )}
              </button>

              <div
                className={`flex flex-col gap-2 border-t border-slate-100 bg-slate-50/70 p-3 md:flex-row md:items-center ${
                  view === "list"
                    ? "lg:w-[min(100%,280px)] lg:flex-shrink-0 lg:self-start lg:border-l lg:border-t-0"
                    : ""
                }`}
              >
                <div className="flex w-full min-h-[2.5rem] flex-1 items-center gap-1.5">
                  {(["draft", "active", "closed"] as EventStatus[]).map(
                    (status) => {
                      const selected = event.status === status;
                      const styles = selected
                        ? status === "draft"
                          ? "bg-slate-800 text-white shadow-sm"
                          : status === "active"
                            ? "bg-emerald-700 text-white shadow-sm"
                            : "bg-amber-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200/90 hover:text-slate-700";

                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleStatusChange(event.id, status);
                          }}
                          className={`h-9 flex-1 rounded-lg px-1 text-[10px] font-bold uppercase tracking-wide transition sm:text-[11px] ${styles}`}
                        >
                          {status}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {filteredEvents.length === 0 && events.length > 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-14 text-center text-sm text-slate-500">
            No events match “{search}”.
          </p>
        )}
        {events.length === 0 && (
          <p className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
            No events yet —{" "}
            <button
              type="button"
              className="font-semibold text-red-700 hover:underline"
              onClick={() => setCreateOpen(true)}
            >
              create one
            </button>
          </p>
        )}
      </div>

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            aria-label="Close dialog"
            onClick={closeModal}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id={dialogTitleId}
                  className="text-xl font-black text-slate-900"
                >
                  New event
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">* Required</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form className="mt-4 grid gap-3" onSubmit={handleCreateEvent}>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Event name *
                </span>
                <input
                  required
                  value={form.name ?? ""}
                  onChange={(ev) =>
                    setForm((current) => ({
                      ...current,
                      name: ev.target.value,
                    }))
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
                  onChange={(ev) =>
                    setForm((current) => ({
                      ...current,
                      eventDate: ev.target.value,
                    }))
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
                  onChange={(ev) =>
                    setForm((current) => ({
                      ...current,
                      location: ev.target.value,
                    }))
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
                  onChange={(ev) =>
                    setForm((current) => ({
                      ...current,
                      registrationDeadline: ev.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Additional info (optional)
                </span>
                <textarea
                  rows={3}
                  value={form.additionalInfo ?? ""}
                  onChange={(ev) =>
                    setForm((current) => ({
                      ...current,
                      additionalInfo: ev.target.value,
                    }))
                  }
                  placeholder="Any extra details teachers should know."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Create event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
