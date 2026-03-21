/**
 * Retries Supabase / fetch calls that fail due to tab throttling, QUIC idle,
 * or brief connection drops (common when switching tabs or on flaky networks).
 */

const DEFAULT_RETRIES = 4;
const DEFAULT_DELAY_MS = 350;

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function messageOf(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  if (typeof e === "object" && e !== null && "message" in e) {
    return String((e as { message: unknown }).message);
  }
  return String(e);
}

/** Business / auth errors: retrying usually does not help. */
export function isNonRetryableSupabaseError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const code =
    "code" in e && typeof (e as { code: unknown }).code === "string"
      ? (e as { code: string }).code
      : "";
  if (code === "PGRST116") return true;
  if (code === "42501" || code === "23505") return true;
  return false;
}

/** GoTrue Web Locks / steal recovery — retrying makes contention worse. */
export function isAuthLockContentionError(e: unknown): boolean {
  const msg = messageOf(e).toLowerCase();
  if (msg.includes("lock broken") && msg.includes("steal")) return true;
  if (msg.includes("orphaned lock")) return true;
  if (msg.includes("navigatorlock") || msg.includes("navigator lock"))
    return true;
  return false;
}

export function isTransientNetworkError(e: unknown): boolean {
  if (isNonRetryableSupabaseError(e)) return false;
  if (isAuthLockContentionError(e)) return false;
  const msg = messageOf(e);
  const lower = msg.toLowerCase();
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("err_connection") ||
    lower.includes("err_network") ||
    lower.includes("quic") ||
    lower.includes("aborted") ||
    lower.includes("timed out") ||
    lower.includes("timeout")
  ) {
    return true;
  }
  if (e && typeof e === "object" && "name" in e) {
    const name = String((e as { name: unknown }).name);
    if (name === "AuthRetryableFetchError") return true;
  }
  return false;
}

export async function withNetworkRetries<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; delayMs?: number },
): Promise<T> {
  const retries = options?.retries ?? DEFAULT_RETRIES;
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
  let last: unknown;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (isNonRetryableSupabaseError(e)) throw e;
      if (!isTransientNetworkError(e) || attempt === retries - 1) throw e;
      await sleep(delayMs * (attempt + 1));
    }
  }
  throw last;
}
