import type { ReactNode } from "react";

export type AdminEventSection =
  | "overview"
  | "registrations"
  | "announcements"
  | "scoreboard"
  | "volunteers";

type AdminShellProps = {
  onNavigate: (to: string) => void;
  children: ReactNode;
  mode: "hub" | "event";
  eventId?: string;
  eventName?: string | null;
  activeSection?: AdminEventSection | null;
};

const EVENT_SECTIONS: { id: AdminEventSection; label: string; path: string }[] =
  [
    { id: "overview", label: "Overview", path: "/overview" },
    { id: "registrations", label: "Registrations", path: "/registrations" },
    { id: "announcements", label: "Announcements", path: "/announcements" },
    { id: "scoreboard", label: "Scoreboard", path: "/scoreboard" },
    { id: "volunteers", label: "Volunteers", path: "/volunteers" },
  ];

const SECTION_TITLE: Record<AdminEventSection, string> = {
  overview: "Overview",
  registrations: "Registrations",
  announcements: "Announcements",
  scoreboard: "Scoreboard",
  volunteers: "Volunteers",
};

export function AdminShell({
  onNavigate,
  children,
  mode,
  eventId,
  eventName,
  activeSection,
}: AdminShellProps) {
  if (mode === "hub") {
    return (
      <main className="min-h-[calc(100vh-4rem)] w-full bg-slate-50 py-6 sm:py-8">
        <div className="w-full px-4 sm:px-6 lg:px-10">{children}</div>
      </main>
    );
  }

  const sectionLabel =
    activeSection != null ? SECTION_TITLE[activeSection] : "Event workspace";
  const pageTitle =
    eventName && activeSection != null
      ? `${eventName} — ${sectionLabel}`
      : (eventName ?? "Loading event…");

  return (
    <main className="min-h-[calc(100vh-4rem)] w-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="relative mx-auto w-full max-w-3xl px-4 pb-6 pt-5 sm:px-6 lg:max-w-4xl lg:px-10">
          <button
            type="button"
            onClick={() => onNavigate("/admin/events")}
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

          <p className="pt-2 text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
            Admin
          </p>
          <h1 className="mx-auto max-w-2xl px-10 pt-1 text-center text-balance text-2xl font-black tracking-tight text-slate-900 sm:px-4 sm:pt-2 sm:text-3xl">
            {pageTitle}
          </h1>
          <p className="mx-auto mt-1 max-w-xl text-center text-xs text-slate-500">
            Event workspace
          </p>

          {eventId && (
            <nav
              className="mx-auto mt-8 flex max-w-[min(100%,36rem)] flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3"
              aria-label="Event sections"
            >
              {EVENT_SECTIONS.map(({ id, label, path }) => {
                const active = activeSection === id;
                const href = `/admin/events/${eventId}${path}`;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onNavigate(href)}
                    className={`rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm transition sm:min-w-[140px] sm:flex-1 sm:py-3 sm:text-base ${
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
          )}
        </div>
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:max-w-4xl lg:px-10">
        {children}
      </div>
    </main>
  );
}
