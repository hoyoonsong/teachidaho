import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  listActiveEvents,
  listAnnouncementsForRole,
  type AnnouncementRecord,
  type EventRecord,
} from "../lib/appDataStore";

type ParticipantsPageProps = {
  onNavigate: (to: string) => void;
};

export function ParticipantsPage({ onNavigate }: ParticipantsPageProps) {
  const { role } = useAuth();
  const [activeEvents, setActiveEvents] = useState<EventRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);

  useEffect(() => {
    async function loadData() {
      const [events, notices] = await Promise.all([
        listActiveEvents(),
        listAnnouncementsForRole(role),
      ]);
      setActiveEvents(events);
      setAnnouncements(notices);
    }
    loadData();
  }, [role]);

  const canRegister = role === "teacher" || role === "admin";

  return (
    <main>
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-[min(94vw,1500px)] px-6 py-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
            Participants
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
            Active Events
          </h1>
          <p className="mt-4 max-w-4xl text-base leading-7 text-slate-700">
            Active events are controlled by the admin workspace and shown here in
            real time.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto w-[min(94vw,1500px)] px-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Supabase-ready UI
            </span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {activeEvents.map((event) => (
              <article
                key={event.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-xl font-bold text-slate-900">
                  {event.name}
                </h3>
                {event.additionalInfo && (
                  <p className="mt-2 text-sm text-slate-600">{event.additionalInfo}</p>
                )}
                <ul className="mt-4 space-y-1 text-sm text-slate-700">
                  <li>
                    <span className="font-semibold text-slate-900">Date:</span>{" "}
                    {event.eventDate}
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">
                      Location:
                    </span>{" "}
                    {event.location}
                  </li>
                  <li>
                    <span className="font-semibold text-slate-900">
                      Deadline:
                    </span>{" "}
                    {event.registrationDeadline}
                  </li>
                </ul>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      canRegister
                        ? onNavigate(`/participants/register?eventId=${event.id}`)
                        : onNavigate(
                            `/login?redirectTo=${encodeURIComponent(
                              `/participants/register?eventId=${event.id}`,
                            )}`,
                          )
                    }
                    className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      canRegister
                        ? "bg-slate-900 text-white hover:bg-slate-700"
                        : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    Register
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="mx-auto w-[min(94vw,1500px)] px-6">
          <h2 className="text-[clamp(2rem,2.8vw,2.4rem)] font-bold tracking-tight text-slate-900">
            Announcements
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            This feed is role-aware: public announcements are always visible, and
            role-specific updates appear once logged in.
          </p>
          <div className="mt-4 space-y-3">
            {announcements.map((notice) => (
              <article
                key={notice.id}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">{notice.title}</h3>
                  <span className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {notice.audience}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{notice.body}</p>
              </article>
            ))}
            {announcements.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No announcements yet.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
