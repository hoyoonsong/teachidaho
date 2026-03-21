import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getParticipantVisibleEvent,
  listPublicTeamsForEvent,
  parseScoreboardGridFromSettings,
  type EventRecord,
  type PublicScoreboardTeamRow,
  type ScoreboardGridState,
} from "../lib/appDataStore";
import { hasSupabaseCredentials, supabase } from "../lib/supabase";
import { scoreboardRowTotal, sortTeamIdsByScoreThenName } from "../lib/scoreboardUtils";

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
  const [expandedMobile, setExpandedMobile] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, teamRows] = await Promise.all([
        getParticipantVisibleEvent(eventId),
        listPublicTeamsForEvent(eventId),
      ]);
      setEvent(ev);
      setTeams(teamRows);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!hasSupabaseCredentials || !supabase) return;
    const client = supabase;

    const channel = client
      .channel(`participant-scoreboard-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "events",
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          const row = payload.new as { custom_settings?: unknown };
          const cs = row.custom_settings as
            | { scoreboardVisibleToParticipants?: boolean }
            | null
            | undefined;
          const vis = cs?.scoreboardVisibleToParticipants !== false;
          const nextGrid = parseScoreboardGridFromSettings(
            row.custom_settings as Parameters<typeof parseScoreboardGridFromSettings>[0],
          );
          setEvent((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              scoreboardVisibleToParticipants: vis,
              ...(nextGrid ? { scoreboard: nextGrid } : {}),
            };
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [eventId]);

  const grid = event?.scoreboard ?? emptyGrid();

  const displayTeams = useMemo(() => {
    const out = teams.slice();
    const seen = new Set(out.map((t) => t.id));
    for (const id of Object.keys(grid.cells)) {
      if (!seen.has(id)) {
        out.push({ id, teamName: "Team", schoolName: "" });
        seen.add(id);
      }
    }
    return sortTeamIdsByScoreThenName(grid, out);
  }, [teams, grid]);

  function toggleMobileRow(teamId: string) {
    setExpandedMobile((prev) => ({ ...prev, [teamId]: !prev[teamId] }));
  }

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

  if (!event.scoreboardVisibleToParticipants) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        <p className="font-semibold text-slate-900">Scoreboard not published for participants</p>
        <p className="mt-2 text-slate-600">
          Event staff have turned off the live scoreboard for this event. Check back later or
          contact the organizer if you have questions.
        </p>
      </div>
    );
  }

  const hasColumns = grid.columns.length > 0;

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-slate-600">
        Live results are read-only. Staff enter scores in the admin workspace.
        {hasSupabaseCredentials && (
          <span className="mt-1 block text-xs font-medium text-emerald-700">
            Rankings update live when scores are saved.
          </span>
        )}
      </p>

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
        <>
          {/* Mobile: compact leaderboard — team + total; tap for breakdown */}
          <div className="space-y-2 md:hidden">
            {displayTeams.map((team, index) => {
              const total = scoreboardRowTotal(grid, team.id);
              const open = Boolean(expandedMobile[team.id]);
              return (
                <div
                  key={team.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleMobileRow(team.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50/80"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900">{team.teamName}</div>
                      <div className="text-xs text-slate-500">
                        {open ? "Hide score breakdown" : "Show score breakdown"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Total
                      </div>
                      <div className="text-xl font-black tabular-nums text-slate-900">{total}</div>
                    </div>
                    <span
                      className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                      aria-hidden
                    >
                      ▼
                    </span>
                  </button>
                  {open && (
                    <div className="space-y-2 border-t border-slate-100 bg-slate-50/90 px-4 py-3">
                      {grid.columns.map((col) => (
                        <div
                          key={col.id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 text-slate-600">{col.label}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                            {grid.cells[team.id]?.[col.id]?.trim() || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop / tablet: full grid without school column */}
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-max min-w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="w-10 px-2 py-3 text-center text-xs font-semibold text-slate-600">
                    #
                  </th>
                  <th className="w-[28%] min-w-[140px] px-3 py-3 font-semibold text-slate-800">
                    Team
                  </th>
                  {grid.columns.map((col) => (
                    <th
                      key={col.id}
                      title={col.label}
                      className="min-w-[4rem] max-w-[9rem] break-words px-2 py-3 text-xs font-semibold uppercase tracking-wide text-slate-700"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="w-16 px-2 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-800">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayTeams.map((team, index) => (
                  <tr key={team.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-2 py-3 text-center tabular-nums text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900">{team.teamName}</td>
                    {grid.columns.map((col) => (
                      <td
                        key={col.id}
                        className="px-2 py-3 text-center text-slate-800 tabular-nums"
                      >
                        {grid.cells[team.id]?.[col.id]?.trim() || "—"}
                      </td>
                    ))}
                    <td className="px-2 py-3 text-right text-sm font-bold tabular-nums text-slate-900">
                      {scoreboardRowTotal(grid, team.id)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
