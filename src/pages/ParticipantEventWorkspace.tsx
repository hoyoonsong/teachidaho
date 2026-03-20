import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  filterAnnouncementsByRole,
  getParticipantVisibleEvent,
  listAnnouncementsForEvent,
  type AnnouncementRecord,
  type EventRecord,
} from "../lib/appDataStore";
import { ParticipantEventScoreboardPage } from "./ParticipantEventScoreboardPage";

export type ParticipantEventSection = "dashboard" | "scoreboard";

type ParticipantEventWorkspaceProps = {
  eventId: string;
  section: ParticipantEventSection;
  onNavigate: (to: string) => void;
};

function formatLongDate(value: string) {
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

const TABS: { id: ParticipantEventSection; label: string; suffix: string }[] = [
  { id: "dashboard", label: "Dashboard", suffix: "" },
  { id: "scoreboard", label: "Scoreboard", suffix: "/scoreboard" },
];

export function ParticipantEventWorkspace({
  eventId,
  section,
  onNavigate,
}: ParticipantEventWorkspaceProps) {
  const { role } = useAuth();
  const canRegister = role === "teacher" || role === "admin";
  const registerTarget = `/participants/register?eventId=${encodeURIComponent(eventId)}`;

  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);

  const loadEvent = useCallback(async () => {
    setLoading(true);
    const row = await getParticipantVisibleEvent(eventId);
    setEvent(row);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await listAnnouncementsForEvent(eventId);
      const visible = filterAnnouncementsByRole(rows, role);
      if (!cancelled) setAnnouncements(visible);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, role]);

  const basePath = `/participants/event/${eventId}`;

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] w-full bg-slate-50">
        <div className="w-full px-4 py-10 sm:px-6 lg:px-10">
          <p className="text-sm font-semibold text-slate-600">Loading event…</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-[calc(100vh-4rem)] w-full bg-slate-50">
        <div className="mx-auto w-[min(94vw,720px)] px-4 py-10 sm:px-6 lg:px-10">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
            <p className="font-bold">This event isn&apos;t available.</p>
            <p className="mt-2 text-rose-800/90">
              It may be private, not yet published, or the link is incorrect.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("/participants")}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              ← All events
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] w-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="flex w-full flex-col gap-3 px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("/participants")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              ← All events
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                {event.name}
              </p>
              <p className="text-xs text-slate-500">Event workspace</p>
            </div>
          </div>
          <nav
            className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3"
            aria-label="Event sections"
          >
            {TABS.map(({ id, label, suffix }) => {
              const active = section === id;
              const href = `${basePath}${suffix}`;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(href)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="w-full px-4 py-6 sm:px-6 lg:px-10">
        {section === "dashboard" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Key details for this event. Registration stays on the Register
                page.
              </p>
              <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4 border-t border-slate-100 pt-6">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Event date
                  </dt>
                  <dd className="mt-1 text-base font-semibold text-slate-900">
                    {formatLongDate(event.eventDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </dt>
                  <dd className="mt-1 text-base font-semibold text-slate-900">
                    {event.location}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Announcements
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Updates for this event. Some posts may require a signed-in
                account.
              </p>
              <div className="mt-5 space-y-3">
                {announcements.map((notice) => (
                  <article
                    key={notice.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/90 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">
                        {notice.title}
                      </h3>
                      <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                        {notice.audience}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      {notice.body}
                    </p>
                  </article>
                ))}
                {announcements.length === 0 && (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 py-10 text-center text-sm text-slate-500">
                    No announcements for this event yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {section === "scoreboard" && (
          <ParticipantEventScoreboardPage eventId={eventId} />
        )}
      </div>
    </main>
  );
}
