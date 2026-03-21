import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { TrashIconButton } from "../../components/ui/TrashIconButton";
import {
  getEventById,
  listTeamsForEvent,
  saveEventScoreboard,
  saveScoreboardParticipantVisibility,
  type EventTeamRow,
  type ScoreboardColumn,
  type ScoreboardGridState,
} from "../../lib/appDataStore";
import {
  scoreboardRowTotal,
  sortTeamIdsByScoreThenName,
} from "../../lib/scoreboardUtils";

type AdminEventScoreboardPageProps = {
  eventId: string;
};

function emptyGrid(): ScoreboardGridState {
  return { columns: [], cells: {} };
}

type RowOrderMode = "alphabetical" | "ranked";

function IconExpandToFullscreen({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function IconExitFullscreen({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}

export function AdminEventScoreboardPage({
  eventId,
}: AdminEventScoreboardPageProps) {
  const [teams, setTeams] = useState<EventTeamRow[]>([]);
  const [grid, setGrid] = useState<ScoreboardGridState>(emptyGrid);
  const [loading, setLoading] = useState(true);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [newColLabel, setNewColLabel] = useState("");
  const [rowOrder, setRowOrder] = useState<RowOrderMode>("alphabetical");
  const [participantVisible, setParticipantVisible] = useState(true);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [event, teamRows] = await Promise.all([
        getEventById(eventId),
        listTeamsForEvent(eventId),
      ]);
      setTeams(
        [...teamRows].sort((a, b) =>
          a.teamName.localeCompare(b.teamName, undefined, {
            sensitivity: "base",
          }),
        ),
      );
      const g = event?.scoreboard ?? emptyGrid();
      const cells = { ...g.cells };
      for (const t of teamRows) {
        if (!cells[t.id]) cells[t.id] = {};
      }
      setGrid({ columns: g.columns.length ? g.columns : [], cells });
      setParticipantVisible(event?.scoreboardVisibleToParticipants !== false);
      setVisibilityError(null);
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
        setPersistError(
          "Could not save scoreboard. Check your connection and try again.",
        );
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
        <p className="text-sm font-semibold text-slate-600">
          Loading scoreboard…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Scoreboard
        </h1>

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300"
            checked={participantVisible}
            onChange={(e) => {
              const next = e.target.checked;
              setParticipantVisible(next);
              setVisibilityError(null);
              void (async () => {
                try {
                  await saveScoreboardParticipantVisibility(eventId, next);
                } catch (err) {
                  console.warn(err);
                  setParticipantVisible(!next);
                  setVisibilityError(
                    "Could not update scoreboard visibility. Check your connection and try again.",
                  );
                }
              })();
            }}
          />
          <span>
            <span className="font-semibold text-slate-900">
              Show live scoreboard to participants
            </span>
          </span>
        </label>
        {visibilityError && (
          <p className="mt-2 text-sm font-medium text-rose-700">
            {visibilityError}
          </p>
        )}
        {persistError && (
          <p className="mt-2 text-sm font-medium text-rose-700">
            {persistError}
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-slate-800">Add score column</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            value={newColLabel}
            onChange={(e) => setNewColLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addColumn();
              }
            }}
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
          No teams yet for this event. Teams appear when teachers add them to
          their registration (or when data exists in the teams table for this
          event).
        </div>
      ) : (
        (() => {
          const toolbar = (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-b border-slate-200 bg-slate-50/95 px-3 py-2">
              <button
                type="button"
                onClick={() => setRowOrder("alphabetical")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
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
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  rowOrder === "ranked"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                Live rankings
              </button>
              {!fullscreen ? (
                <button
                  type="button"
                  onClick={() => setFullscreen(true)}
                  title="Full screen"
                  aria-label="Open scoreboard in full screen"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 transition hover:bg-slate-100"
                >
                  <IconExpandToFullscreen className="h-5 w-5" />
                </button>
              ) : null}
            </div>
          );

          const tableScrollClass = fullscreen
            ? "min-h-0 flex-1 overflow-auto"
            : "max-h-[min(78vh,calc(100dvh-11rem))] overflow-auto";

          const spreadsheetTable = (
            <div className={`${tableScrollClass} w-full bg-slate-50/90`}>
              <table className="w-full min-w-[720px] border-collapse text-sm bg-white">
                <thead className="sticky top-0 z-20 shadow-sm">
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="sticky left-0 z-30 min-w-[160px] max-w-[220px] bg-slate-50 px-2 py-2 pl-3 text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Team
                    </th>
                    {grid.columns.map((col) => (
                      <th
                        key={col.id}
                        className="min-w-[5.5rem] max-w-[10rem] px-1 py-2 align-bottom"
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
                            onBlur={(e) =>
                              commitColumnLabel(col.id, e.target.value)
                            }
                            className="min-w-0 max-w-full flex-1 rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-semibold uppercase leading-tight tracking-wide text-slate-800 sm:text-xs"
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
                  {displayTeams.map((team, rowIdx) => (
                    <tr
                      key={team.id}
                      className={
                        rowIdx === displayTeams.length - 1
                          ? "border-b-2 border-slate-200"
                          : "border-b border-slate-100"
                      }
                    >
                      <td className="sticky left-0 z-10 min-w-[160px] max-w-[220px] bg-white px-2 py-1.5 pl-3 align-top shadow-[4px_0_12px_-6px_rgba(15,23,42,0.15)]">
                        <div className="text-sm font-semibold leading-tight text-slate-900">
                          {team.teamName}
                        </div>
                        <div className="mt-0.5 text-[9px] leading-tight text-slate-400">
                          <span className="line-clamp-2">
                            {team.schoolName}
                          </span>
                          <span className="text-slate-300"> · </span>
                          <span className="break-all">{team.teacherEmail}</span>
                        </div>
                      </td>
                      {grid.columns.map((col) => (
                        <td key={col.id} className="px-1 py-1 align-middle">
                          <input
                            value={grid.cells[team.id]?.[col.id] ?? ""}
                            onChange={(e) =>
                              setCell(team.id, col.id, e.target.value)
                            }
                            onBlur={(e) =>
                              flushCell(team.id, col.id, e.target.value)
                            }
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
                <tfoot>
                  <tr className="bg-slate-100/95">
                    <td
                      colSpan={Math.max(grid.columns.length + 2, 2)}
                      className="border-t-2 border-slate-200 px-3 py-2.5 text-center text-[11px] font-medium leading-snug text-slate-500"
                    >
                      End of scoreboard grid · Columns are added above; scores
                      save when you leave a cell.
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );

          const spreadsheetShell = (
            <div
              className={
                fullscreen
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  : "overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              }
            >
              {toolbar}
              {spreadsheetTable}
            </div>
          );

          const spreadsheetBody = (
            <div
              className={
                fullscreen ? "flex min-h-0 flex-1 flex-col" : "flex flex-col"
              }
            >
              {spreadsheetShell}
            </div>
          );

          return fullscreen ? (
            <>
              {createPortal(
                <div className="fixed inset-0 z-[200] flex flex-col bg-slate-100">
                  <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                    <p className="text-sm font-bold text-slate-900">
                      Scoreboard
                    </p>
                    <button
                      type="button"
                      onClick={() => setFullscreen(false)}
                      title="Exit full screen"
                      aria-label="Exit full screen"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-800 transition hover:bg-slate-100"
                    >
                      <IconExitFullscreen className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
                    {spreadsheetBody}
                  </div>
                </div>,
                document.body,
              )}
            </>
          ) : (
            spreadsheetBody
          );
        })()
      )}
    </div>
  );
}
