import { useCallback, useEffect, useMemo, useState } from "react";
import { TrashIconButton } from "../../components/ui/TrashIconButton";
import {
  getEventById,
  listTeamsForEvent,
  saveEventScoreboard,
  type EventTeamRow,
  type ScoreboardColumn,
  type ScoreboardGridState,
} from "../../lib/appDataStore";
import { scoreboardRowTotal, sortTeamIdsByScoreThenName } from "../../lib/scoreboardUtils";

type AdminEventScoreboardPageProps = {
  eventId: string;
};

function emptyGrid(): ScoreboardGridState {
  return { columns: [], cells: {} };
}

type RowOrderMode = "alphabetical" | "ranked";

export function AdminEventScoreboardPage({ eventId }: AdminEventScoreboardPageProps) {
  const [teams, setTeams] = useState<EventTeamRow[]>([]);
  const [grid, setGrid] = useState<ScoreboardGridState>(emptyGrid);
  const [loading, setLoading] = useState(true);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [newColLabel, setNewColLabel] = useState("");
  const [rowOrder, setRowOrder] = useState<RowOrderMode>("alphabetical");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [event, teamRows] = await Promise.all([
        getEventById(eventId),
        listTeamsForEvent(eventId),
      ]);
      setTeams(
        [...teamRows].sort((a, b) =>
          a.teamName.localeCompare(b.teamName, undefined, { sensitivity: "base" }),
        ),
      );
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

  function removeColumn(columnId: string) {
    const col = grid.columns.find((c) => c.id === columnId);
    const label = col?.label ?? "this column";
    if (
      !confirm(
        `Remove “${label}” and all scores in that column? This cannot be undone.`,
      )
    ) {
      return;
    }
    setGrid((current) => {
      const columns = current.columns.filter((c) => c.id !== columnId);
      const cells: ScoreboardGridState["cells"] = {};
      for (const [tid, row] of Object.entries(current.cells)) {
        const copy = { ...row };
        delete copy[columnId];
        cells[tid] = copy;
      }
      const next = { columns, cells };
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

  const displayTeams = useMemo(() => {
    if (rowOrder === "alphabetical") return teams;
    return sortTeamIdsByScoreThenName(grid, teams);
  }, [teams, grid, rowOrder]);

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
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Scoreboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Spreadsheet uses full window width below. School and teacher sit under each team name.
          Remove a score column with the trash icon. Values save when you leave a cell.
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
          No teams yet for this event. Teams appear when teachers add them to their registration
          (or when data exists in the teams table for this event).
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Row order:</span>{" "}
                <strong>A–Z</strong> for stable entry · <strong>Live rankings</strong> to preview
                the board.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRowOrder("alphabetical")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    rowOrder === "alphabetical"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  A–Z (editing)
                </button>
                <button
                  type="button"
                  onClick={() => setRowOrder("ranked")}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    rowOrder === "ranked"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  Live rankings
                </button>
              </div>
            </div>
          </div>

          {/* Break out of admin max-width so the grid can use the full viewport */}
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen max-w-[100vw]">
            <div className="px-3 pb-8 sm:px-5 lg:px-8">
              <div className="max-h-[min(78vh,calc(100dvh-11rem))] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[720px] table-fixed border-collapse text-sm lg:min-w-0">
                  <thead className="sticky top-0 z-20 shadow-sm">
                    <tr className="border-b border-slate-200 bg-slate-50 text-left">
                      <th className="sticky left-0 z-30 w-[min(22vw,220px)] min-w-[160px] bg-slate-50 px-2 py-2 pl-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                        Team
                      </th>
                      {grid.columns.map((col) => (
                        <th
                          key={col.id}
                          className="w-24 min-w-[5.5rem] px-1 py-2 align-bottom lg:w-28"
                        >
                          <div className="flex items-end gap-0.5">
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
                              className="min-w-0 flex-1 rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-800 sm:text-xs"
                            />
                            <TrashIconButton
                              onClick={() => removeColumn(col.id)}
                              label={`Remove column ${col.label}`}
                              size="sm"
                            />
                          </div>
                        </th>
                      ))}
                      <th className="w-16 min-w-[4rem] px-2 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-800">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayTeams.map((team) => (
                      <tr key={team.id} className="border-b border-slate-100">
                        <td className="sticky left-0 z-10 w-[min(22vw,220px)] min-w-[160px] bg-white px-2 py-2 pl-3 align-top shadow-[4px_0_12px_-6px_rgba(15,23,42,0.15)]">
                          <div className="font-semibold leading-snug text-slate-900">
                            {team.teamName}
                          </div>
                          <div className="mt-1 text-[10px] leading-snug text-slate-500 sm:text-[11px]">
                            <span className="line-clamp-2">{team.schoolName}</span>
                            <span className="text-slate-300"> · </span>
                            <span className="break-all">{team.teacherEmail}</span>
                          </div>
                        </td>
                        {grid.columns.map((col) => (
                          <td key={col.id} className="px-1 py-1 align-middle">
                            <input
                              value={grid.cells[team.id]?.[col.id] ?? ""}
                              onChange={(e) => setCell(team.id, col.id, e.target.value)}
                              onBlur={(e) => flushCell(team.id, col.id, e.target.value)}
                              className="w-full rounded border border-slate-200 px-1.5 py-1.5 text-center text-sm tabular-nums lg:px-2"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-2 text-right text-sm font-bold tabular-nums text-slate-900">
                          {scoreboardRowTotal(grid, team.id)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
