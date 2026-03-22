import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { withNetworkRetries } from "../lib/networkRetry";
import {
  clearPersistedSupabaseSession,
  hasSupabaseCredentials,
  supabase,
} from "../lib/supabase";
import type { UserRole } from "../types/auth";

const ROLE_CACHE_VALUES: readonly UserRole[] = [
  "admin",
  "teacher",
  "volunteer",
  "student",
] as const;

function isUserRole(s: string): s is UserRole {
  return (ROLE_CACHE_VALUES as readonly string[]).includes(s);
}

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  /** Supabase auth user id when signed in. */
  userId: string | null;
  role: UserRole | null;
  email: string | null;
  /** Best-effort display name from profile or auth metadata (user may edit on forms). */
  displayName: string | null;
  hasSupabaseCredentials: boolean;
  refreshRole: () => Promise<void>;
  signInWithPassword: (
    email: string,
    password: string,
  ) => Promise<string | null>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName?: string,
    options?: { signupRole?: "teacher" | "student" | "volunteer" },
  ) => Promise<string | null>;
  signInWithGoogle: (redirectTo?: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

type ProfileRow = {
  role: UserRole;
  full_name: string | null;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

function roleCacheKey(userId: string) {
  return `teachidaho.role.${userId}`;
}

function getCachedRole(userId: string): UserRole | null {
  const cached = window.localStorage.getItem(roleCacheKey(userId));
  if (cached && isUserRole(cached)) return cached;
  return null;
}

function setCachedRole(userId: string, role: UserRole) {
  window.localStorage.setItem(roleCacheKey(userId), role);
}

function clearCachedRole(userId: string) {
  window.localStorage.removeItem(roleCacheKey(userId));
}

async function fetchProfileBasics(
  userId: string,
): Promise<{ role: UserRole | null; fullName: string | null }> {
  const client = supabase;
  if (!client) return { role: null, fullName: null };

  try {
    const result = await withNetworkRetries(async () => {
      const res = await client
        .from("profiles")
        .select("role, full_name")
        .eq("id", userId)
        .single<ProfileRow>();
      if (res.error?.code === "PGRST116") return res;
      if (res.error) throw res.error;
      return res;
    });

    if (result.error || !result.data) {
      return { role: null, fullName: null };
    }
    const fn = result.data.full_name?.trim() || null;
    return {
      role: result.data.role ?? null,
      fullName: fn,
    };
  } catch {
    return { role: null, fullName: null };
  }
}

function displayNameFromSession(session: Session | null): string | null {
  const meta = session?.user.user_metadata as
    | Record<string, unknown>
    | undefined;
  const fromFull =
    typeof meta?.full_name === "string" ? meta.full_name.trim() : "";
  const fromName = typeof meta?.name === "string" ? meta.name.trim() : "";
  const s = fromFull || fromName;
  return s || null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profileFullName, setProfileFullName] = useState<string | null>(null);

  const resolveRoleFromSession = useCallback(
    async (nextSession: Session | null) => {
      if (!nextSession?.user) {
        setRole(null);
        setProfileFullName(null);
        return;
      }
      const userId = nextSession.user.id;
      const cachedRole = getCachedRole(userId);
      if (cachedRole) {
        setRole(cachedRole);
      } else {
        setRole(null);
      }

      const { role: liveRole, fullName } = await fetchProfileBasics(userId);
      if (fullName) {
        setProfileFullName(fullName);
      } else {
        setProfileFullName(null);
      }

      if (liveRole) {
        setRole(liveRole);
        setCachedRole(userId, liveRole);
        return;
      }

      if (!cachedRole) {
        setRole(null);
      }
    },
    [],
  );

  useEffect(() => {
    const client = supabase;
    if (!hasSupabaseCredentials || !client) {
      setSession(null);
      setRole(null);
      setIsLoading(false);
      return;
    }
    const supabaseClient = client;

    let active = true;
    async function bootstrap() {
      try {
        /**
         * Finish OAuth/PKCE URL handling before getSession (constructor starts this async;
         * awaiting avoids races with our first getSession).
         */
        const initRes = await supabaseClient.auth.initialize();
        if (initRes?.error) {
          console.warn(
            "[TeachIdaho] Supabase auth initialize:",
            initRes.error.message,
          );
        }

        let sessionResult = await withNetworkRetries(
          () => supabaseClient.auth.getSession(),
          { retries: 5, delayMs: 400 },
        );
        let nextSession = sessionResult.data.session;

        /**
         * If the URL still has ?code= but there’s no session, PKCE didn’t run (common:
         * sign-in started on another origin, e.g. localhost, callback on Vercel — verifier
         * is in localStorage per-origin). Try explicit exchange once for clearer errors.
         */
        if (
          !nextSession &&
          typeof window !== "undefined" &&
          window.location.search.includes("code=")
        ) {
          const code = new URLSearchParams(window.location.search).get("code");
          if (code) {
            const exchanged =
              await supabaseClient.auth.exchangeCodeForSession(code);
            if (exchanged.error) {
              console.warn(
                "[TeachIdaho] OAuth code exchange failed. Start and finish “Continue with Google” on the same origin you’re on now (see docs/supabase-auth-redirects.md):",
                exchanged.error.message,
              );
            } else {
              nextSession = exchanged.data.session;
            }
          }
        }

        if (!active) return;

        setSession(nextSession);
        /** Don’t block the whole app (or /login) on profiles fetch — OAuth callback needs to render + redirect. */
        if (active) setIsLoading(false);
        await resolveRoleFromSession(nextSession);
      } catch (error) {
        if (!active) return;
        console.warn("Failed to initialize Supabase auth session.", error);
        setSession(null);
        setRole(null);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (_event, nextSession) => {
      try {
        setSession(nextSession);
        await resolveRoleFromSession(nextSession);
      } catch (error) {
        console.warn("Failed during auth state change handling.", error);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [resolveRoleFromSession]);

  /** When the tab wakes up, refresh the session (timers / fetch were often throttled while hidden). */
  useEffect(() => {
    if (!hasSupabaseCredentials || !supabase) return;
    const client = supabase;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void (async () => {
        try {
          client.auth.startAutoRefresh();
        } catch {
          /* ignore */
        }
        try {
          const { data } = await withNetworkRetries(
            () => client.auth.getSession(),
            { retries: 4, delayMs: 400 },
          );
          setSession(data.session);
          await resolveRoleFromSession(data.session);
        } catch (e) {
          console.warn("Session refresh after tab focus failed.", e);
        }
      })();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [resolveRoleFromSession]);

  const refreshRole = useCallback(async () => {
    const client = supabase;
    if (!client || !hasSupabaseCredentials) return;
    try {
      const {
        data: { session: nextSession },
      } = await withNetworkRetries(() => client.auth.getSession(), {
        retries: 4,
        delayMs: 350,
      });
      setSession(nextSession);
      await resolveRoleFromSession(nextSession);
    } catch (e) {
      console.warn("refreshRole failed", e);
    }
  }, [resolveRoleFromSession]);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase || !hasSupabaseCredentials) {
        return "Supabase auth is not configured yet.";
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return error.message;
      const {
        data: { session: nextSession },
      } = await supabase.auth.getSession();
      setSession(nextSession);
      await resolveRoleFromSession(nextSession);
      return null;
    },
    [resolveRoleFromSession],
  );

  const signUpWithPassword = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string,
      options?: { signupRole?: "teacher" | "student" | "volunteer" },
    ): Promise<string | null> => {
      if (!supabase || !hasSupabaseCredentials) {
        return "Supabase auth is not configured yet.";
      }

      const role = options?.signupRole ?? "teacher";
      /** Use current tab origin so confirm links aren’t tied to Supabase “Site URL” (often localhost in dev). */
      const emailRedirectTo = `${window.location.origin}/login`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            full_name: fullName?.trim() || undefined,
            signup_role: role,
          },
        },
      });

      if (error) return error.message;
      return null;
    },
    [],
  );

  const signInWithGoogle = useCallback(
    async (redirectTo = "/"): Promise<string | null> => {
      if (!supabase || !hasSupabaseCredentials) {
        return "Supabase auth is not configured yet.";
      }

      const callbackUrl = `${window.location.origin}/login?redirectTo=${encodeURIComponent(
        redirectTo,
      )}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
        },
      });
      if (error) return error.message;
      return null;
    },
    [],
  );

  const signOut = useCallback(async () => {
    const currentUserId = session?.user.id ?? null;
    if (currentUserId) {
      clearCachedRole(currentUserId);
    }

    /**
     * Clear React auth state **synchronously** (this tick). After OAuth, `signOut()` can
     * hang; if we awaited it before this, “Sign out” looked dead. `App` awaits this before
     * `navigate("/login")`, so we must not block on GoTrue.
     */
    setRole(null);
    setSession(null);
    setIsLoading(false);

    if (!supabase || !hasSupabaseCredentials) {
      return;
    }

    const client = supabase;
    const SIGN_OUT_WAIT_MS = 5000;
    void (async () => {
      try {
        try {
          client.auth.stopAutoRefresh();
        } catch {
          /* ignore */
        }
        await Promise.race([
          client.auth.signOut({ scope: "local" }),
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () => reject(new Error("signOut timed out")),
              SIGN_OUT_WAIT_MS,
            );
          }),
        ]);
      } catch (error) {
        console.warn(
          "[TeachIdaho] Supabase signOut failed or timed out; clearing persisted session.",
          error,
        );
        clearPersistedSupabaseSession();
      }
    })();
  }, [session?.user.id]);

  const displayName = profileFullName ?? displayNameFromSession(session);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(session),
      userId: session?.user.id ?? null,
      role,
      email: session?.user.email ?? null,
      displayName,
      hasSupabaseCredentials,
      refreshRole,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      signOut,
    }),
    [
      isLoading,
      role,
      session,
      session?.user.id,
      displayName,
      refreshRole,
      signInWithGoogle,
      signInWithPassword,
      signUpWithPassword,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
