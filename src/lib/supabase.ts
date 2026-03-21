import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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
      /**
       * Default Web Locks (navigator.locks) + React 19 dev / double effects + multiple
       * components calling Supabase at once causes "Lock broken by steal" / orphaned
       * lock warnings and failed getSession. A no-op lock is fine for a typical
       * single-tab app; use the default if you need strict multi-tab coordination.
       */
      lock: async (_name, _acquireTimeout, fn) => fn(),
    },
  });
  window.__teachIdahoSupabaseClient = client;
  return client;
}

export const supabase: SupabaseClient | null = getSupabaseClient();

/** Dev: drop singleton on HMR so auth options (e.g. custom lock) actually apply. */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    delete window.__teachIdahoSupabaseClient;
  });
}
