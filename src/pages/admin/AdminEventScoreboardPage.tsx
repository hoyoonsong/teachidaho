import { useCallback, useEffect, useState } from "react";
import {
  getEventById,
  listTeamsForEvent,
  saveEventScoreboard,
  type EventTeamRow,
  type ScoreboardColumn,
  type ScoreboardGridState,
} from "../../lib/appDataStore";

type AdminEventScoreboardPageProps = {
  eventId: string;
};

function emptyGrid(): ScoreboardGridState {
  return { columns: [], cells: {} };
}

export function AdminEventScoreboardPage({ eventId }: AdminEventScoreboardPageProps) {
  const [teams, setTeams] = useState<EventTeamRow[]>([]);
  const [grid, setGrid] = useState<ScoreboardGridState>(emptyGrid);
  const [loading, setLoading] = useState(true);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [newColLabel, setNewColLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [event, teamRows] = await Promise.all([
        getEventById(eventId),
        listTeamsForEvent(eventId),
      ]);
      setTeams(teamRows);
      const g = event?.scoreboard ?? emptyGrid();
      const cells = { ...g.cells };
      for (const t of teamRows) {
        if (!cells[t.id]) cells[t.id] = {};
      }
      setGrid({ columns: g.columns.length ? g.columns : [], cells });
      setPersistError(null);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const persist = useCallback(
    async (next: ScoreboardGridState) => {
      setPersistError(null);
      try {
        await saveEventScoreboard(eventId, next);
      } catch (err) {
        console.warn(err);
        setPersistError("Could not save scoreboard. Check your connection and try again.");
      }
    },
    [eventId],
  );

  function commitColumnLabel(columnId: string, label: string) {
    setGrid((current) => {
      const columns = current.columns.map((c) =>
        c.id === columnId ? { ...c, label } : c,
      );
      const next = { ...current, columns };
      void persist(next);
      return next;
    });
  }

  function addColumn() {
    const label = newColLabel.trim() || "New column";
    const id = `col_${crypto.randomUUID().slice(0, 8)}`;
    const col: ScoreboardColumn = { id, label };
    setGrid((current) => {
      const columns = [...current.columns, col];
      const cells = { ...current.cells };
      for (const t of teams) {
        if (!cells[t.id]) cells[t.id] = {};
      }
      const next = { columns, cells };
      void persist(next);
      return next;
    });
    setNewColLabel("");
  }

  function setCell(teamId: string, columnId: string, value: string) {
    setGrid((current) => {
      const cells = { ...current.cells };
      const row = { ...(cells[teamId] ?? {}) };
      row[columnId] = value;
      cells[teamId] = row;
      return { ...current, cells };
    });
  }

  function flushCell(teamId: string, columnId: string, value: string) {
    setGrid((current) => {
      const cells = { ...current.cells };
      const row = { ...(cells[teamId] ?? {}) };
      row[columnId] = value;
      cells[teamId] = row;
      const next = { ...current, cells };
      void persist(next);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-600">Loading scoreboard…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Scoreboard
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          One row per registered team. Add score columns (like a spreadsheet), then
          enter values. Data saves when you leave a field.
        </p>
        {persistError && (
          <p className="mt-2 text-sm font-medium text-rose-700">{persistError}</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">Add score column</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={newColLabel}
            onChange={(e) => setNewColLabel(e.target.value)}
            placeholder="e.g. Round 1, Judge total…"
            className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addColumn}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Add column
          </button>
        </div>
      </div>

      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No teams yet for this event. Teams appear when teachers add them to their
          registration (or when data exists in the teams table for this event).
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[640px] w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 font-semibold text-slate-800">
                  Team
                </th>
                <th className="px-3 py-2 font-semibold text-slate-800">School</th>
                <th className="px-3 py-2 font-semibold text-slate-800">Teacher</th>
                {grid.columns.map((col) => (
                  <th key={col.id} className="min-w-[120px] px-2 py-2 font-semibold text-slate-800">
                    <input
                      value={col.label}
                      onChange={(e) => {
                        const v = e.target.value;
                        setGrid((c) => ({
                          ...c,
                          columns: c.columns.map((x) =>
                            x.id === col.id ? { ...x, label: v } : x,
                          ),
                        }));
                      }}
                      onBlur={(e) => commitColumnLabel(col.id, e.target.value)}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-wide"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-b border-slate-100">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-900">
                    {team.teamName}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{team.schoolName}</td>
                  <td className="px-3 py-2 text-slate-600">{team.teacherEmail}</td>
                  {grid.columns.map((col) => (
                    <td key={col.id} className="px-2 py-1">
                      <input
                        value={grid.cells[team.id]?.[col.id] ?? ""}
                        onChange={(e) => setCell(team.id, col.id, e.target.value)}
                        onBlur={(e) => flushCell(team.id, col.id, e.target.value)}
                        className="w-full min-w-[96px] rounded border border-slate-200 px-2 py-1.5 text-sm"
                      />
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
