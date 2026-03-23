import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { ParticipantEventAnnouncementsList } from "../components/announcements/ParticipantEventAnnouncementsList";
import { EventAnnouncementsSignupBlurb } from "../components/events/EventAnnouncementsSignupBlurb";
import {
  getParticipantVisibleEvent,
  isEventAnnouncementLocallyDeclined,
  participantCanViewEventScopedAnnouncements,
  subscribeToEventAnnouncements,
  unsubscribeFromEventAnnouncements,
  type EventRecord,
} from "../lib/appDataStore";
import { ParticipantEventScoreboardPage } from "./ParticipantEventScoreboardPage";

export type ParticipantEventSection = "dashboard" | "scoreboard";

type ParticipantEventWorkspaceProps = {
  eventId: string;
  section: ParticipantEventSection;
  onNavigate: (to: string) => void;
  /** Current app path — used to re-check opt-in after login or navigation. */
  locationPath: string;
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

function participantSectionTabs(event: EventRecord | null) {
  if (event && !event.scoreboardVisibleToParticipants) {
    return TABS.filter((t) => t.id !== "scoreboard");
  }
  return TABS;
}

export function ParticipantEventWorkspace({
  eventId,
  section,
  onNavigate,
  locationPath,
}: ParticipantEventWorkspaceProps) {
  const { isAuthenticated, role, isLoading: authLoading, userId } = useAuth();
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [canViewEventFeed, setCanViewEventFeed] = useState(false);
  const [feedAccessLoading, setFeedAccessLoading] = useState(true);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [optInBusy, setOptInBusy] = useState(false);
  const [optInError, setOptInError] = useState<string | null>(null);
  const [unsubscribeError, setUnsubscribeError] = useState<string | null>(null);
  const autoOptInAttempted = useRef(false);

  const basePath = `/participants/event/${eventId}`;
  const studentLoginUrl = `/login?signupRole=student&redirectTo=${encodeURIComponent(basePath)}`;

  /** Students/volunteers who are not opted in yet (teachers/admins use registration or global tools). */
  const showSubscribeCta =
    !authLoading &&
    !feedAccessLoading &&
    !canViewEventFeed &&
    !(role === "teacher" || role === "admin");

  /** Teacher with no submitted/approved registration for this event — same gate as the announcement feed. */
  const showTeacherRegisterCta =
    !authLoading &&
    !feedAccessLoading &&
    isAuthenticated &&
    role === "teacher" &&
    !canViewEventFeed;

  const registerForThisEventUrl = `/participants/register?eventId=${encodeURIComponent(eventId)}`;

  useEffect(() => {
    autoOptInAttempted.current = false;
  }, [eventId]);

  /** Signed-in student/volunteer: opt in once automatically (same as legacy /subscribe). */
  useEffect(() => {
    if (!event || authLoading || feedAccessLoading) return;
    if (role !== "student" && role !== "volunteer") return;
    if (isEventAnnouncementLocallyDeclined(eventId)) return;
    if (canViewEventFeed || autoOptInAttempted.current) return;
    autoOptInAttempted.current = true;
    void (async () => {
      try {
        await subscribeToEventAnnouncements(eventId);
        const can = await participantCanViewEventScopedAnnouncements(
          eventId,
          role,
          true,
        );
        setCanViewEventFeed(can);
        setFeedRefreshKey((k) => k + 1);
        setOptInError(null);
      } catch {
        autoOptInAttempted.current = false;
        setOptInError("Could not enable announcements. Try again below.");
      }
    })();
  }, [
    event,
    eventId,
    role,
    canViewEventFeed,
    authLoading,
    feedAccessLoading,
    isAuthenticated,
  ]);

  /**
   * Event row and announcement access are independent; one round-trip worth of
   * parallel work instead of waiting for the event fetch before the feed gate.
   */
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);
    setFeedAccessLoading(true);
    void (async () => {
      try {
        const [row, can] = await Promise.all([
          getParticipantVisibleEvent(eventId),
          participantCanViewEventScopedAnnouncements(
            eventId,
            role,
            isAuthenticated,
          ),
        ]);
        if (cancelled) return;
        setEvent(row);
        setCanViewEventFeed(can);
      } catch {
        if (!cancelled) {
          setEvent(null);
          setCanViewEventFeed(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setFeedAccessLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId, authLoading, isAuthenticated, role, locationPath]);

  async function handleUnsubscribeFromEventUpdates() {
    if (
      !confirm("Stop receiving event-specific announcements for this event?")
    ) {
      return;
    }
    setUnsubscribeError(null);
    try {
      await unsubscribeFromEventAnnouncements(eventId);
      setCanViewEventFeed(false);
      setFeedRefreshKey((k) => k + 1);
      autoOptInAttempted.current = true;
    } catch (e) {
      setUnsubscribeError(
        e instanceof Error
          ? e.message
          : "Could not update your preference. Try again.",
      );
    }
  }

  async function handleManualOptIn() {
    if (role !== "student" && role !== "volunteer") return;
    setOptInBusy(true);
    setOptInError(null);
    try {
      await subscribeToEventAnnouncements(eventId);
      const can = await participantCanViewEventScopedAnnouncements(
        eventId,
        role,
        true,
      );
      setCanViewEventFeed(can);
      setFeedRefreshKey((k) => k + 1);
      setUnsubscribeError(null);
    } catch {
      setOptInError("Could not enable announcements. Check your connection.");
    } finally {
      setOptInBusy(false);
    }
  }

  const sectionTabs = useMemo(() => participantSectionTabs(event), [event]);

  useEffect(() => {
    if (!event) return;
    if (event.scoreboardVisibleToParticipants) return;
    if (section === "scoreboard") {
      onNavigate(basePath);
    }
  }, [event, section, basePath, onNavigate]);

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
            {sectionTabs.map(({ id, label, suffix }) => {
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
              <dl className="flex flex-wrap gap-x-12 gap-y-4">
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
            </div>

            {showTeacherRegisterCta ? (
              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-6 shadow-sm">
                <h2 className="text-lg font-bold tracking-tight text-indigo-950 sm:text-xl">
                  Register for this event
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-indigo-950/85">
                  Submit your school&apos;s registration for{" "}
                  <span className="font-semibold text-indigo-950">
                    {event.name}
                  </span>{" "}
                  to unlock announcements and other participant updates on this
                  page. You can save a draft and come back anytime.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate(registerForThisEventUrl)}
                  className="mt-5 rounded-xl bg-indigo-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm ring-2 ring-indigo-950/10 transition hover:bg-indigo-950"
                >
                  Register or continue registration
                </button>
              </div>
            ) : null}

            {canViewEventFeed && role ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                  Your announcements
                </h2>

                <div className="mt-5">
                  <ParticipantEventAnnouncementsList
                    eventId={eventId}
                    role={role}
                    currentUserId={userId}
                    isAdmin={role === "admin"}
                    refreshKey={feedRefreshKey}
                  />
                </div>
                {(role === "student" || role === "volunteer") && (
                  <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                    {unsubscribeError ? (
                      <p className="mb-3 text-xs font-medium text-rose-700">
                        {unsubscribeError}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={() => void handleUnsubscribeFromEventUpdates()}
                        className="underline decoration-slate-300 underline-offset-2 transition hover:text-slate-800"
                      >
                        Stop receiving announcements for this event
                      </button>
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {showSubscribeCta ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
                <EventAnnouncementsSignupBlurb
                  registerAction={
                    <button
                      type="button"
                      onClick={() => onNavigate("/participants/register")}
                      className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:decoration-emerald-600"
                    >
                      Register
                    </button>
                  }
                  primaryAction={
                    !isAuthenticated ? (
                      <button
                        type="button"
                        onClick={() => onNavigate(studentLoginUrl)}
                        className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        Sign in or create account (student)
                      </button>
                    ) : role === "student" || role === "volunteer" ? (
                      <div className="space-y-2">
                        {optInError ? (
                          <p className="text-sm font-medium text-rose-700">
                            {optInError}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          disabled={optInBusy}
                          onClick={() => void handleManualOptIn()}
                          className="rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-50"
                        >
                          {optInBusy
                            ? "Enabling…"
                            : "Enable announcements for this event"}
                        </button>
                      </div>
                    ) : null
                  }
                />
              </div>
            ) : null}
          </div>
        )}

        {section === "scoreboard" && (
          <ParticipantEventScoreboardPage eventId={eventId} />
        )}
      </div>
    </main>
  );
}
