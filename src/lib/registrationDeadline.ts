/**
 * True after the end of the registration deadline day (local time) or after an ISO instant.
 */
export function isRegistrationDeadlinePassed(deadline: string): boolean {
  const raw = deadline.trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const endOfDay = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      23,
      59,
      59,
      999,
    );
    return Date.now() > endOfDay.getTime();
  }
  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return false;
  return Date.now() > ms;
}

/** Long due line for highlighted registration banners (e.g. “Due: Fri, Mar 20, 2026, 11:59 PM”). */
export function formatRegistrationDueLine(deadline: string): string {
  const raw = deadline.trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      23,
      59,
      0,
      0,
    );
    return `Due: ${d.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) {
    return `Due: ${new Date(t).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }
  return `Due: ${deadline}`;
}
