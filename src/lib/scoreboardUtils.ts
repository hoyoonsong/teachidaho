import type { ScoreboardGridState } from "./appDataStore";

/** Parse a cell value as a number for totals (commas ok; non-numeric → 0). */
export function parseScoreCellToNumber(raw: string | undefined): number {
  if (raw === undefined || raw === null) return 0;
  const n = Number.parseFloat(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Sum of numeric values across all scoreboard columns for one team. */
export function scoreboardRowTotal(grid: ScoreboardGridState, teamId: string): number {
  const row = grid.cells[teamId];
  if (!row) return 0;
  let total = 0;
  for (const col of grid.columns) {
    total += parseScoreCellToNumber(row[col.id]);
  }
  return total;
}

export function sortTeamIdsByScoreThenName<T extends { id: string; teamName: string }>(
  grid: ScoreboardGridState,
  teams: T[],
): T[] {
  return [...teams].sort((a, b) => {
    const diff = scoreboardRowTotal(grid, b.id) - scoreboardRowTotal(grid, a.id);
    if (diff !== 0) return diff;
    return a.teamName.localeCompare(b.teamName, undefined, { sensitivity: "base" });
  });
}
