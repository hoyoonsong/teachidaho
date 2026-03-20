import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getParticipantVisibleEvent,
  listPublicTeamsForEvent,
  type EventRecord,
  type PublicScoreboardTeamRow,
  type ScoreboardGridState,
} from "../lib/appDataStore";

type ParticipantEventScoreboardPageProps = {
  eventId: string;
};

function emptyGrid(): ScoreboardGridState {
  return { columns: [], cells: {} };
}

export function ParticipantEventScoreboardPage({
  eventId,
}: ParticipantEventScoreboardPageProps) {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [teams, setTeams] = useState<PublicScoreboardTeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, teamRows] = await Promise.all([
        getParticipantVisibleEvent(eventId),
        listPublicTeamsForEvent(eventId),
      ]);
      setEvent(ev);
      const sorted = [...teamRows].sort((a, b) =>
        a.teamName.localeCompare(b.teamName, undefined, { sensitivity: "base" }),
      );
      setTeams(sorted);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grid = event?.scoreboard ?? emptyGrid();

  /** Known teams from RPC, plus any row keys present only in the saved grid. */
  const displayTeams = useMemo(() => {
    const out = teams.slice();
    const seen = new Set(out.map((t) => t.id));
    for (const id of Object.keys(grid.cells)) {
      if (!seen.has(id)) {
        out.push({ id, teamName: "Team", schoolName: "—" });
        seen.add(id);
      }
    }
    return out.sort((a, b) =>
      a.teamName.localeCompare(b.teamName, undefined, { sensitivity: "base" }),
    );
  }, [teams, grid.cells]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-600">Loading scoreboard…</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        This scoreboard isn&apos;t available.
      </div>
    );
  }

  const hasColumns = grid.columns.length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Scoreboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Live results for this event. Values are entered by event staff; this view is
          read-only.
        </p>
      </div>

      {!hasColumns && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No scoreboard has been published for this event yet.
        </div>
      )}

      {hasColumns && displayTeams.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          Score columns are set up, but no teams are listed yet.
        </div>
      )}

      {hasColumns && displayTeams.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[560px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 font-semibold text-slate-800">
                  Team
                </th>
                <th className="px-4 py-3 font-semibold text-slate-800">School</th>
                {grid.columns.map((col) => (
                  <th
                    key={col.id}
                    className="min-w-[100px] px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-700"
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayTeams.map((team) => (
                <tr key={team.id} className="border-b border-slate-100 last:border-0">
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-900">
                    {team.teamName}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{team.schoolName}</td>
                  {grid.columns.map((col) => (
                    <td key={col.id} className="px-3 py-3 text-slate-800 tabular-nums">
                      {grid.cells[team.id]?.[col.id]?.trim() || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
