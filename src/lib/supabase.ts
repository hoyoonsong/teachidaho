import type { LockFunc } from "@supabase/auth-js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * In Vite dev, React runs extra mount/unmount cycles; GoTrue’s default
 * `navigator.locks` auth mutex often hits “Lock broken by steal” and breaks
 * every query. Production keeps the default lock (fine for real users).
 */
const devNoopAuthLock: LockFunc = (_name, _acquireTimeout, fn) => fn();

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseAnonKey);

if (import.meta.env.DEV && !hasSupabaseCredentials) {
  console.warn(
    "[TeachIdaho] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.example to .env.local and restart the dev server. Supabase calls will fail with “No API key found”.",
  );
}

declare global {
  interface Window {
    __teachIdahoSupabaseClient?: SupabaseClient;
  }
}

function getSupabaseClient() {
  if (!hasSupabaseCredentials) return null;
  if (window.__teachIdahoSupabaseClient) {
    return window.__teachIdahoSupabaseClient;
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      ...(import.meta.env.DEV ? { lock: devNoopAuthLock } : {}),
    },
  });
  window.__teachIdahoSupabaseClient = client;
  return client;
}

export const supabase: SupabaseClient | null = getSupabaseClient();

/**
 * Removes Supabase GoTrue session keys from storage. Use when `auth.signOut()` never settles
 * (same hung-client class of bug as stuck `getSession` after OAuth) so the UI can log out
 * and the next visit doesn’t resurrect a ghost session from localStorage.
 */
export function clearPersistedSupabaseSession(): void {
  if (typeof window === "undefined") return;
  const storages: Storage[] = [window.localStorage];
  try {
    if (window.sessionStorage) storages.push(window.sessionStorage);
  } catch {
    /* ignore */
  }
  for (const storage of storages) {
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (!k) continue;
        if (k.startsWith("sb-") && k.includes("auth")) toRemove.push(k);
      }
      for (const k of toRemove) storage.removeItem(k);
    } catch {
      /* ignore */
    }
  }
}

/** Dev: drop singleton on HMR so auth options (e.g. custom lock) actually apply. */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    delete window.__teachIdahoSupabaseClient;
  });
}
