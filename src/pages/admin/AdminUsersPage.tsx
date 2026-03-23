import { useEffect, useMemo, useState } from "react";
import {
  adminSetUserRole,
  listAdminProfiles,
  listAdminUsersRegisteredEvents,
  type AdminProfileRecord,
  type AdminUserEventRegistration,
} from "../../lib/appDataStore";
import type { UserRole } from "../../types/auth";

const ROLES: UserRole[] = ["admin", "teacher", "volunteer", "student"];

type AdminUsersPageProps = {
  onNavigate: (to: string) => void;
};

function statusLabel(s: AdminUserEventRegistration["registrationStatus"]) {
  switch (s) {
    case "draft":
      return "Draft";
    case "submitted":
      return "Submitted";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return s;
  }
}

export function AdminUsersPage({ onNavigate }: AdminUsersPageProps) {
  const [profiles, setProfiles] = useState<AdminProfileRecord[]>([]);
  const [eventsByTeacher, setEventsByTeacher] = useState<
    Record<string, AdminUserEventRegistration[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [rows, regMap] = await Promise.all([
        listAdminProfiles(),
        listAdminUsersRegisteredEvents(),
      ]);
      setProfiles(rows);
      setEventsByTeacher(regMap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const blob = `${p.email} ${p.fullName ?? ""} ${p.role}`.toLowerCase();
      return blob.includes(q);
    });
  }, [profiles, search]);

  async function handleRoleChange(userId: string, next: UserRole) {
    setBusyId(userId);
    setError(null);
    try {
      await adminSetUserRole(userId, next);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update role");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={() => onNavigate("/admin/events")}
          className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
        >
          ← All events
        </button>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
          Users &amp; roles
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Every row is an account in <code className="text-xs">profiles</code>.
          Changing role takes effect immediately for site access. Expand a user
          to see <strong>published</strong> or <strong>active</strong> events
          they&apos;re registered for (closed events are hidden).
        </p>
        {error ? (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        ) : null}
        <label className="mt-4 block max-w-md">
          <span className="sr-only">Search users</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email, name, or role…"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {loading ? (
        <p className="text-sm font-semibold text-slate-600">Loading users…</p>
      ) : (
        <div className="space-y-3">
          {filteredProfiles.map((p) => {
            const open = expandedId === p.id;
            const regEvents = eventsByTeacher[p.id] ?? [];
            return (
              <div
                key={p.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex w-full items-start gap-3 px-4 py-3 sm:items-center sm:px-5 sm:py-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : p.id)}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left transition hover:opacity-90 sm:items-center"
                    aria-expanded={open}
                  >
                    <span
                      className={`mt-0.5 inline-block shrink-0 text-slate-400 transition-transform duration-200 sm:mt-0 ${
                        open ? "rotate-180" : ""
                      }`}
                      aria-hidden
                    >
                      ▾
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{p.email}</p>
                      <p className="mt-0.5 text-sm text-slate-600">
                        {p.fullName ?? "—"}{" "}
                        <span className="text-slate-400">·</span> joined{" "}
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                  <div className="shrink-0 pt-0.5 sm:pt-0">
                    <label className="sr-only" htmlFor={`role-${p.id}`}>
                      Role for {p.email}
                    </label>
                    <select
                      id={`role-${p.id}`}
                      value={p.role}
                      disabled={busyId === p.id}
                      onChange={(ev) =>
                        void handleRoleChange(p.id, ev.target.value as UserRole)
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {open ? (
                  <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6 sm:py-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Published &amp; active events
                    </p>
                    {regEvents.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-600">
                        No registrations on published or active events.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {regEvents.map((ev) => (
                          <li
                            key={ev.eventId}
                            className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="font-medium text-slate-900">
                              {ev.eventName}
                            </span>
                            <span className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                                {statusLabel(ev.registrationStatus)}
                              </span>
                              <span className="text-slate-500">
                                Event: {ev.eventStatus}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onNavigate(
                                    `/admin/events/${ev.eventId}/registrations`,
                                  )
                                }
                                className="font-semibold text-emerald-800 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-950"
                              >
                                Open registrations →
                              </button>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
          {profiles.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No profiles found.
            </p>
          )}
          {profiles.length > 0 && filteredProfiles.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
              No users match your search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
