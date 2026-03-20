import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import RichTextDisplay from "../components/richText/RichTextDisplay";
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
      const visible = filterAnnouncementsByRole(rows, role).filter(
        (a) => !a.deletedAt,
      );
      if (!cancelled) setAnnouncements(visible);
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, role]);

  const basePath = `/participants/event/${eventId}`;

  const sectionLabel = section === "dashboard" ? "Dashboard" : "Scoreboard";

  const pageTitle = useMemo(() => {
    if (!event) return "";
    return `${event.name} — ${sectionLabel}`;
  }, [event, sectionLabel]);

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
              className="mt-4 text-sm font-semibold text-rose-900 underline decoration-rose-300 underline-offset-2 transition hover:decoration-rose-600"
            >
              ← Back to all events
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] w-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="relative mx-auto w-full max-w-3xl px-4 pb-6 pt-5 sm:px-6 lg:max-w-4xl lg:px-10">
          <button
            type="button"
            onClick={() => onNavigate("/participants")}
            className="group absolute left-4 top-5 z-10 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900 sm:left-6 lg:left-10"
          >
            <span
              className="inline-block translate-y-px text-slate-400 transition group-hover:-translate-x-0.5 group-hover:text-slate-700"
              aria-hidden
            >
              ←
            </span>
            All events
          </button>

          <h1 className="mx-auto max-w-2xl px-14 pt-8 text-center text-balance text-2xl font-black tracking-tight text-slate-900 sm:px-4 sm:pt-6 sm:text-3xl">
            {pageTitle}
          </h1>

          <nav
            className="mx-auto mt-8 flex max-w-[min(100%,26rem)] flex-col gap-2.5 sm:flex-row sm:justify-center sm:gap-3"
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
                  className={`rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition sm:min-w-[160px] sm:flex-1 sm:py-3 sm:text-base ${
                    active
                      ? "bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-2"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:max-w-4xl lg:px-10">
        {section === "dashboard" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Event details
              </p>
              <dl className="mt-4 flex flex-wrap gap-x-12 gap-y-4">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Date
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-900">
                    {formatLongDate(event.eventDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-900">
                    {event.location}
                  </dd>
                </div>
              </dl>
              <p className="mt-6 border-t border-slate-100 pt-6 text-sm text-slate-600">
                <span className="font-medium text-slate-800">Registration</span> happens on the
                Register page —{" "}
                <button
                  type="button"
                  onClick={() =>
                    canRegister
                      ? onNavigate(registerTarget)
                      : onNavigate(
                          `/login?redirectTo=${encodeURIComponent(registerTarget)}`,
                        )
                  }
                  className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-600"
                >
                  {canRegister ? "open the form" : "sign in to register"}
                </button>
                .
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Your announcements
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
                    <div className="mt-2">
                      <RichTextDisplay content={notice.body} />
                    </div>
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
