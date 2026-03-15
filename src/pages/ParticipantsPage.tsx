import { useMemo, useState } from "react";

type EventItem = {
  id: string;
  name: string;
  dateLabel: string;
  location: string;
  registrationDeadline: string;
  summary: string;
  status: "active" | "draft" | "closed";
};

const demoEvents: EventItem[] = [
  {
    id: "econ-2026",
    name: "International Economic Summit 2026",
    dateLabel: "May 1-2, 2026",
    location: "Boise, Idaho",
    registrationDeadline: "Apr 18, 2026",
    summary:
      "Country-team presentations, leadership sessions, and collaborative simulation rounds.",
    status: "active",
  },
  {
    id: "pitch-2026",
    name: "Idaho HS Entrepreneurs Challenge 2026",
    dateLabel: "Apr 24, 2026",
    location: "Nampa, Idaho",
    registrationDeadline: "Apr 10, 2026",
    summary:
      "Students build venture ideas, get feedback from mentors, and pitch to judges.",
    status: "active",
  },
  {
    id: "fall-workshop",
    name: "Fall Startup Workshop",
    dateLabel: "Sep 2026",
    location: "TBD",
    registrationDeadline: "TBD",
    summary:
      "Teacher-focused prep workshop for entrepreneurship classroom activities.",
    status: "draft",
  },
];

export function ParticipantsPage() {
  const [isTeacherLoggedIn, setIsTeacherLoggedIn] = useState(false);
  const activeEvents = useMemo(
    () => demoEvents.filter((event) => event.status === "active"),
    [],
  );

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
            This page is prepared for Supabase-backed event listings. For now,
            it uses placeholder entries to preview how active opportunities will
            appear for students and teachers.
          </p>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto w-[min(94vw,1500px)] px-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[clamp(2rem,2.8vw,2.4rem)] font-bold tracking-tight text-slate-900">
              Open for Participation
            </h2>
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
                <p className="mt-2 text-sm text-slate-600">{event.summary}</p>
                <ul className="mt-4 space-y-1 text-sm text-slate-700">
                  <li>
                    <span className="font-semibold text-slate-900">Date:</span>{" "}
                    {event.dateLabel}
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
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
