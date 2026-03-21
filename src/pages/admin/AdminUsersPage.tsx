import { useEffect, useMemo, useState } from "react";
import {
  adminSetUserRole,
  listAdminProfiles,
  type AdminProfileRecord,
} from "../../lib/appDataStore";
import type { UserRole } from "../../types/auth";

const ROLES: UserRole[] = ["admin", "teacher", "volunteer", "student"];

type AdminUsersPageProps = {
  onNavigate: (to: string) => void;
};

export function AdminUsersPage({ onNavigate }: AdminUsersPageProps) {
  const [profiles, setProfiles] = useState<AdminProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const rows = await listAdminProfiles();
      setProfiles(rows);
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
          Changing role takes effect immediately for site access.
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
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProfiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {p.email}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {p.fullName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={p.role}
                      disabled={busyId === p.id}
                      onChange={(ev) =>
                        void handleRoleChange(
                          p.id,
                          ev.target.value as UserRole,
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800 disabled:opacity-50"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {profiles.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">
              No profiles found.
            </p>
          )}
          {profiles.length > 0 && filteredProfiles.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">
              No users match your search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
