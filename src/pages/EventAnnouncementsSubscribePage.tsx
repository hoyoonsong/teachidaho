import { useCallback, useEffect, useState } from "react";
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
};

function buildLoginUrl(eventId: string, signupRole: "student" | "volunteer") {
  const back = `/participants/event/${eventId}/subscribe`;
  return `/login?signupRole=${signupRole}&redirectTo=${encodeURIComponent(back)}`;
}

export function EventAnnouncementsSubscribePage({
  eventId,
  onNavigate,
}: EventAnnouncementsSubscribePageProps) {
  const { isAuthenticated, role, userId } = useAuth();
  const isAdmin = role === "admin";
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!confirm("Stop receiving event-specific announcements for this event?")) return;
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

  const basePath = `/participants/event/${eventId}`;

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

  const needsStudentOrVolunteerAccount =
    isAuthenticated && role === "teacher";

  const showSubscribedFeed =
    subscribed && (role === "student" || role === "volunteer");

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
        Event announcements
      </h1>

      {showSubscribedFeed ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            You&apos;re receiving{" "}
            <span className="font-semibold text-slate-800">
              {role === "student" ? "student" : "volunteer"}
            </span>{" "}
            updates for <span className="font-semibold">{event.name}</span>.
            Your event hub shows the same feed on the dashboard.
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
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Subscribe to receive{" "}
          <span className="font-semibold text-slate-800">student</span> or{" "}
          <span className="font-semibold text-slate-800">volunteer</span>{" "}
          announcements for this event, and{" "}
          <span className="font-semibold text-slate-800">event-wide public</span>{" "}
          posts (those stay hidden until you opt in). Teachers use{" "}
          <strong>Register</strong> instead of this page.
        </p>
      )}

      {error ? (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="mt-8 space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Students</h2>
          <p className="mt-2 text-sm text-slate-600">
            New here? Create a <strong>student</strong> account (email sign-up)
            so you only get student announcements for events you care about.
          </p>
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={() => onNavigate(buildLoginUrl(eventId, "student"))}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Sign in or create student account
            </button>
          ) : role === "student" ? (
            <div className="mt-4">
              {subscribed && showSubscribedFeed ? (
                <p className="text-sm text-slate-600">
                  Student updates for this event are on. Use the subtle link
                  under the announcement list to opt out, or use another role
                  below if needed.
                </p>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSubscribe()}
                  className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Receive student announcements"}
                </button>
              )}
            </div>
          ) : role === "admin" ? (
            <p className="mt-4 text-sm text-slate-600">
              As an admin you already see all announcements. Students use the
              button above after signing in with a student account.
            </p>
          ) : needsStudentOrVolunteerAccount ? (
            <p className="mt-4 text-sm text-amber-900">
              Your account is a <strong>teacher</strong> profile. Student
              announcements use a separate student login. Sign out and create a
              student account with the button above, or ask an admin to add a
              second account for you.
            </p>
          ) : role === "volunteer" ? (
            <p className="mt-4 text-sm text-slate-600">
              Use the volunteer section below for volunteer-targeted posts.
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Volunteers</h2>
          <p className="mt-2 text-sm text-slate-600">
            Subscribe to receive volunteer announcements for this event. Use a{" "}
            <strong>volunteer</strong> account (email sign-up).
          </p>
          {!isAuthenticated ? (
            <button
              type="button"
              onClick={() => onNavigate(buildLoginUrl(eventId, "volunteer"))}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Sign in or create volunteer account
            </button>
          ) : role === "volunteer" ? (
            <div className="mt-4">
              {subscribed && showSubscribedFeed ? (
                <p className="text-sm text-slate-600">
                  Volunteer updates for this event are on. Use the link under
                  the announcement list to opt out.
                </p>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleSubscribe()}
                  className="rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Subscribe as volunteer"}
                </button>
              )}
            </div>
          ) : role === "admin" ? (
            <p className="mt-4 text-sm text-slate-600">
              Volunteers sign in with a volunteer account to subscribe here.
            </p>
          ) : role === "teacher" ? (
            <p className="mt-4 text-sm text-amber-900">
              Your account is a <strong>teacher</strong> profile. Sign out and
              create a volunteer account to subscribe here, or ask an admin.
            </p>
          ) : role === "student" ? (
            <p className="mt-4 text-sm text-slate-600">
              Use the student section above for student-targeted posts.
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
          <p>
            <strong className="text-slate-800">Teachers:</strong> you receive
            teacher announcements automatically when you register for this event
            on the{" "}
            <button
              type="button"
              onClick={() => onNavigate("/participants/register")}
              className="font-semibold text-emerald-800 underline decoration-emerald-200"
            >
              Register
            </button>{" "}
            page.
          </p>
        </section>
      </div>
    </main>
  );
}
