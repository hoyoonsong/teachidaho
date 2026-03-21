import { useCallback, useEffect, useRef, useState } from "react";
import { ParticipantEventAnnouncementsList } from "../components/announcements/ParticipantEventAnnouncementsList";
import { useAuth } from "../hooks/useAuth";
import {
  getEventAnnouncementSubscription,
  getParticipantVisibleEvent,
  subscribeToEventAnnouncements,
  unsubscribeFromEventAnnouncements,
  type EventRecord,
} from "../lib/appDataStore";

type EventAnnouncementsSubscribePageProps = {
  eventId: string;
  onNavigate: (to: string) => void;
  /** Volunteer QR landing — only volunteer accounts may subscribe here. */
  volunteerLink?: boolean;
};

function buildVolunteerLoginUrl(eventId: string) {
  const back = `/participants/event/${eventId}/subscribe/volunteer`;
  return `/login?signupRole=volunteer&redirectTo=${encodeURIComponent(back)}`;
}

export function EventAnnouncementsSubscribePage({
  eventId,
  onNavigate,
  volunteerLink = false,
}: EventAnnouncementsSubscribePageProps) {
  const {
    isAuthenticated,
    role,
    userId,
    isLoading: authLoading,
  } = useAuth();
  const isAdmin = role === "admin";
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoSubscribeAttempted = useRef(false);

  const basePath = `/participants/event/${eventId}`;
  const studentLoginWithReturn = `/login?signupRole=student&redirectTo=${encodeURIComponent(basePath)}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ev, sub] = await Promise.all([
        getParticipantVisibleEvent(eventId),
        getEventAnnouncementSubscription(eventId),
      ]);
      setEvent(ev);
      setSubscribed(sub);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this page.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    autoSubscribeAttempted.current = false;
  }, [eventId, volunteerLink, role]);

  async function handleSubscribe() {
    setBusy(true);
    setError(null);
    try {
      await subscribeToEventAnnouncements(eventId);
      setSubscribed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Subscribe failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUnsubscribe() {
    if (!confirm("Stop receiving event-specific announcements for this event?"))
      return;
    setBusy(true);
    setError(null);
    try {
      await unsubscribeFromEventAnnouncements(eventId);
      setSubscribed(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unsubscribe failed.");
    } finally {
      setBusy(false);
    }
  }

  /** Public URL only: opt in then main page handles the feed. */
  useEffect(() => {
    if (volunteerLink || loading || !event || authLoading) return;
    if (!isAuthenticated || (role !== "student" && role !== "volunteer")) return;
    if (subscribed || autoSubscribeAttempted.current) return;
    autoSubscribeAttempted.current = true;
    void (async () => {
      try {
        await subscribeToEventAnnouncements(eventId);
        setSubscribed(true);
      } catch (e) {
        autoSubscribeAttempted.current = false;
        setError(e instanceof Error ? e.message : "Subscribe failed.");
      }
    })();
  }, [
    volunteerLink,
    loading,
    event,
    isAuthenticated,
    role,
    subscribed,
    eventId,
    authLoading,
  ]);

  /** Public URL: send guests and already-opted-in users to the main event page (or login first). */
  useEffect(() => {
    if (volunteerLink || loading || !event || authLoading) return;
    if (!isAuthenticated) {
      onNavigate(studentLoginWithReturn);
      return;
    }
    if (role === "admin" || role === "teacher") {
      onNavigate(basePath);
      return;
    }
    if (
      (role === "student" || role === "volunteer") &&
      subscribed
    ) {
      onNavigate(basePath);
    }
  }, [
    volunteerLink,
    loading,
    event,
    isAuthenticated,
    role,
    subscribed,
    basePath,
    onNavigate,
    studentLoginWithReturn,
    authLoading,
  ]);

  if (loading) {
    return (
      <main className="mx-auto w-[min(94vw,720px)] px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold text-slate-600">Loading…</p>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="mx-auto w-[min(94vw,720px)] px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
          <p className="font-bold">This event isn&apos;t available.</p>
          <button
            type="button"
            onClick={() => onNavigate("/participants")}
            className="mt-4 font-semibold underline"
          >
            ← Back to events
          </button>
        </div>
      </main>
    );
  }

  if (volunteerLink && authLoading) {
    return (
      <main className="mx-auto w-[min(94vw,720px)] px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold text-slate-600">Loading…</p>
      </main>
    );
  }

  /** Volunteer QR: students never subscribe or see volunteer messaging here. */
  if (volunteerLink && isAuthenticated && role === "student") {
    return (
      <main className="mx-auto w-[min(94vw,720px)] px-4 py-10 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate(basePath)}
          className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
        >
          ← {event.name}
        </button>
        <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900">
          Volunteers only
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          This link is for <strong>volunteer</strong> accounts. You’re signed in
          as a <strong>student</strong>, so you can’t use the volunteer signup
          flow here.
        </p>
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Use your event page instead</p>
          <p className="mt-2">
            Student announcements and opt-in are on the main event dashboard—not
            this volunteer link.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate(basePath)}
          className="mt-6 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900"
        >
          Open event page
        </button>
      </main>
    );
  }

  const showVolunteerFeed =
    volunteerLink && subscribed && role === "volunteer";

  if (volunteerLink) {
    return (
      <main className="mx-auto w-[min(94vw,720px)] px-4 py-10 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate(basePath)}
          className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
        >
          ← {event.name}
        </button>

        <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900">
          Volunteer announcements
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          This link is for <strong>volunteers</strong> only. Sign in or create a
          volunteer account, then opt in for{" "}
          <span className="font-semibold">{event.name}</span>.
        </p>

        {error ? (
          <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        {showVolunteerFeed ? (
          <>
            <p className="mt-6 text-sm text-slate-600">
              You&apos;re subscribed to <strong>volunteer</strong> updates for
              this event.
            </p>
            <div className="mt-8">
              <ParticipantEventAnnouncementsList
                eventId={eventId}
                role={role}
                currentUserId={userId}
                isAdmin={isAdmin}
              />
            </div>
            <p className="mt-8 text-center text-xs text-slate-500">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleUnsubscribe()}
                className="underline decoration-slate-300 underline-offset-2 transition hover:text-slate-800 disabled:opacity-50"
              >
                Stop receiving announcements for this event
              </button>
            </p>
          </>
        ) : (
          <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {!isAuthenticated ? (
              <>
                <p className="text-sm text-slate-600">
                  Sign in or create a volunteer account to finish subscribing.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate(buildVolunteerLoginUrl(eventId))}
                  className="mt-4 rounded-xl bg-violet-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-900"
                >
                  Sign in or create volunteer account
                </button>
              </>
            ) : role === "volunteer" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSubscribe()}
                className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Receive volunteer announcements"}
              </button>
            ) : role === "teacher" ? (
              <p className="text-sm text-amber-900">
                Teacher accounts don&apos;t use this page. Use{" "}
                <strong>Register</strong> for teacher updates, or sign out and
                use a volunteer account here.
              </p>
            ) : role === "admin" ? (
              <p className="text-sm text-slate-600">
                Admins already see all announcements. Share this page with
                volunteers via the QR code in the admin event workspace.
              </p>
            ) : null}
          </section>
        )}
      </main>
    );
  }

  /** Public `/subscribe`: only reached while student/volunteer and not subscribed yet (or error). */
  return (
    <main className="mx-auto w-[min(94vw,720px)] px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold text-slate-600">
        {error
          ? "Could not finish setup."
          : "Turning on announcements for this event…"}
      </p>
      {error ? (
        <>
          <p className="mt-2 text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => onNavigate(basePath)}
            className="mt-4 text-sm font-semibold text-emerald-800 underline"
          >
            Go to event page
          </button>
        </>
      ) : null}
    </main>
  );
}
