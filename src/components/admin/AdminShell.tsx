import type { ReactNode } from "react";

export type AdminEventSection =
  | "overview"
  | "registrations"
  | "announcements"
  | "scoreboard";

type AdminShellProps = {
  onNavigate: (to: string) => void;
  children: ReactNode;
  mode: "hub" | "event";
  eventId?: string;
  eventName?: string | null;
  activeSection?: AdminEventSection | null;
};

const EVENT_SECTIONS: { id: AdminEventSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "registrations", label: "Registrations" },
  { id: "announcements", label: "Announcements" },
  { id: "scoreboard", label: "Scoreboard" },
];

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

  return (
    <main className="min-h-[calc(100vh-4rem)] w-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="flex w-full flex-col gap-3 px-4 py-4 sm:px-6 lg:px-10">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate("/admin/events")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
            >
              ← All events
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                {eventName ?? "Loading event…"}
              </p>
              <p className="text-xs text-slate-500">Event workspace</p>
            </div>
          </div>
          {eventId && (
            <nav
              className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3"
              aria-label="Event sections"
            >
              {EVENT_SECTIONS.map(({ id, label }) => {
                const href = `/admin/events/${eventId}/${id}`;
                const active = activeSection === id;
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
          )}
        </div>
      </div>
      <div className="w-full px-4 py-6 sm:px-6 lg:px-10">{children}</div>
    </main>
  );
}
