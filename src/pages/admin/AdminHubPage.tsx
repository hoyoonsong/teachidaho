type AdminHubPageProps = {
  onNavigate: (to: string) => void;
};

const CARDS: { to: string; title: string; description: string }[] = [
  {
    to: "/admin/events",
    title: "Events",
    description: "Create events, open registrations, scoreboards, and per-event tools.",
  },
  {
    to: "/admin/users",
    title: "Users & roles",
    description: "View accounts and assign admin, teacher, volunteer, or student roles.",
  },
  {
    to: "/admin/announcements",
    title: "Site announcements",
    description:
      "Org-wide posts: public notices or role feeds. Link an event to target teachers who registered for that event only.",
  },
];

export function AdminHubPage({ onNavigate }: AdminHubPageProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Admin
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose a section. You can also use the <strong>Admin</strong> menu in
          the header.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-1">
        {CARDS.map((c) => (
          <li key={c.to}>
            <button
              type="button"
              onClick={() => onNavigate(c.to)}
              className="w-full rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <h2 className="text-lg font-bold text-slate-900">{c.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{c.description}</p>
              <p className="mt-3 text-sm font-semibold text-emerald-800">
                Open →
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
