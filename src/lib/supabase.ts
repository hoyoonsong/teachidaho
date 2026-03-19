import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseAnonKey);

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
    },
  });
  window.__teachIdahoSupabaseClient = client;
  return client;
}

export const supabase: SupabaseClient | null = getSupabaseClient();
