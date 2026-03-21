import { useEffect, useState } from "react";
import {
  listActiveEvents,
  type EventRecord,
} from "../lib/appDataStore";

type ParticipantsPageProps = {
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

/** Matches admin event cards (public-facing labels). */
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
    case "closed":
      return {
        label: "Closed",
        className: "bg-amber-100 text-amber-900 ring-amber-200/70",
      };
    default:
      return {
        label: event.status,
        className: "bg-slate-100 text-slate-700 ring-slate-200/80",
      };
  }
}

export function ParticipantsPage({ onNavigate }: ParticipantsPageProps) {
  const [activeEvents, setActiveEvents] = useState<EventRecord[]>([]);

  useEffect(() => {
    async function loadData() {
      const events = await listActiveEvents();
      setActiveEvents(events);
    }
    void loadData();
  }, []);

  const gridClass =
    "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6";

  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-[min(94vw,1280px)] px-4 py-10 sm:px-6 lg:px-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            Participants
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Active Events
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
            Open an event for details and announcements. Registration uses the
            same form as before on the{" "}
            <button
              type="button"
              onClick={() => onNavigate("/participants/register")}
              className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
            >
              Register
            </button>{" "}
            page.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto w-[min(94vw,1280px)] px-4 sm:px-6 lg:px-10">
          <div className={gridClass}>
            {activeEvents.map((event) => {
              const badge = statusBadge(event);
              const desc = event.additionalInfo?.trim();
              const metaLine = `${formatCardDate(event.eventDate)} · ${event.location}`;

              return (
                <article
                  key={event.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100/80 transition hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onNavigate(`/participants/event/${event.id}`)
                    }
                    className="relative flex flex-1 flex-col p-5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 md:p-6"
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
                </article>
              );
            })}

            {activeEvents.length === 0 && (
              <p className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center text-sm text-slate-500">
                No active events right now.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
