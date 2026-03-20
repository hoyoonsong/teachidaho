import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { hasSupabaseCredentials, supabase } from "../lib/supabase";
import type { UserRole } from "../types/auth";

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  email: string | null;
  /** Best-effort display name from profile or auth metadata (user may edit on forms). */
  displayName: string | null;
  hasSupabaseCredentials: boolean;
  refreshRole: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (
    email: string,
    password: string,
    fullName?: string,
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
  if (cached === "admin" || cached === "teacher" || cached === "volunteer") {
    return cached;
  }
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
  if (!supabase) return { role: null, fullName: null };

  try {
    const query = supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", userId)
      .single<ProfileRow>();

    const timeout = new Promise<null>((resolve) => {
      window.setTimeout(() => resolve(null), 2500);
    });

    const result = await Promise.race([query, timeout]);
    if (!result) return { role: null, fullName: null };

    if (!result.error && result.data) {
      const fn = result.data.full_name?.trim() || null;
      return {
        role: result.data.role ?? null,
        fullName: fn,
      };
    }
  } catch {
    return { role: null, fullName: null };
  }

  return { role: null, fullName: null };
}

function displayNameFromSession(session: Session | null): string | null {
  const meta = session?.user.user_metadata as Record<string, unknown> | undefined;
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

  const resolveRoleFromSession = useCallback(async (nextSession: Session | null) => {
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
  }, []);

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
        const sessionQuery = supabaseClient.auth.getSession();
        const timeout = new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 3000);
        });

        const sessionResult = await Promise.race([sessionQuery, timeout]);
        if (!active) return;
        if (!sessionResult) {
          setSession(null);
          setRole(null);
          return;
        }

        const nextSession = sessionResult.data.session;

        setSession(nextSession);
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

  const refreshRole = useCallback(async () => {
    if (!supabase || !hasSupabaseCredentials) return;
    const {
      data: { session: nextSession },
    } = await supabase.auth.getSession();
    setSession(nextSession);
    await resolveRoleFromSession(nextSession);
  }, [resolveRoleFromSession]);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      if (!supabase || !hasSupabaseCredentials) {
        return "Supabase auth is not configured yet.";
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
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
    ): Promise<string | null> => {
      if (!supabase || !hasSupabaseCredentials) {
        return "Supabase auth is not configured yet.";
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName?.trim() || undefined,
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
    if (supabase && hasSupabaseCredentials) {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch (error) {
        console.warn("Supabase sign out failed, clearing local auth state.", error);
      }
    }
    if (currentUserId) {
      clearCachedRole(currentUserId);
    }
    setRole(null);
    setSession(null);
  }, [session?.user.id]);

  const displayName = profileFullName ?? displayNameFromSession(session);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: Boolean(session),
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
