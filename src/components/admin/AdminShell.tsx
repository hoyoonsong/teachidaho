import type { ReactNode } from "react";

type AdminShellProps = {
  currentPath: string;
  onNavigate: (to: string) => void;
  children: ReactNode;
};

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/registrations", label: "Registrations" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/scoreboard", label: "Scoreboard" },
];

export function AdminShell({ currentPath, onNavigate, children }: AdminShellProps) {
  return (
    <main className="bg-slate-50 py-8">
      <div className="mx-auto grid w-[min(94vw,1500px)] gap-6 px-6 lg:grid-cols-[230px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Admin Workspace
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Create events, review submissions, and post scoped announcements.
          </p>
          <nav className="mt-4 space-y-2">
            {adminLinks.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => onNavigate(link.href)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                  currentPath === link.href
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </aside>
        <section>{children}</section>
      </div>
    </main>
  );
}
