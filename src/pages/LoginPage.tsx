import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

type LoginPageProps = {
  onNavigate: (to: string) => void;
  redirectTo?: string;
  /** When set (e.g. from /login?signupRole=student), new accounts get this profile role. */
  signupRole?: "teacher" | "student" | "volunteer";
};

export function LoginPage({
  onNavigate,
  redirectTo = "/",
  signupRole,
}: LoginPageProps) {
  const {
    signInWithGoogle,
    hasSupabaseCredentials,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(() =>
    signupRole === "student" || signupRole === "volunteer"
      ? "signup"
      : "signin",
  );
  const oauthReturnWithoutSession = useMemo(() => {
    if (authLoading || isAuthenticated) return false;
    return Boolean(new URLSearchParams(window.location.search).get("code"));
  }, [authLoading, isAuthenticated]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const safeRedirectTo = useMemo(
    () => (redirectTo.startsWith("/login") ? "/" : redirectTo),
    [redirectTo],
  );

  /** Nudge PKCE exchange when Google redirects back with ?code= (detectSessionInUrl + getSession). */
  useEffect(() => {
    if (!hasSupabaseCredentials || !supabase) return;
    const sp = new URLSearchParams(window.location.search);
    if (!sp.get("code")) return;
    void supabase.auth.getSession();
  }, [hasSupabaseCredentials]);

  /**
   * After OAuth, strip ?code= / ?state= from the address bar and sync App’s in-memory URL.
   * Otherwise the SPA can keep showing a long login URL even though you’re signed in.
   */
  useEffect(() => {
    if (!hasSupabaseCredentials || !supabase) return;
    if (!isAuthenticated) return;
    const sp = new URLSearchParams(window.location.search);
    if (!sp.get("code") && !sp.get("state")) return;

    const u = new URL(window.location.href);
    u.searchParams.delete("code");
    u.searchParams.delete("state");
    const qs = u.searchParams.toString();
    const clean = `${u.pathname}${qs ? `?${qs}` : ""}${u.hash}`;
    const cur = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (clean !== cur) {
      onNavigate(clean);
    }
  }, [hasSupabaseCredentials, isAuthenticated, onNavigate]);

  useEffect(() => {
    if (isAuthenticated) {
      onNavigate(safeRedirectTo);
    }
  }, [isAuthenticated, onNavigate, safeRedirectTo]);

  async function handleGoogleSignIn() {
    setError(null);
    setMessage(null);
    const nextError = await signInWithGoogle(safeRedirectTo);
    if (nextError) {
      setError(nextError);
    }
  }

  return (
    <main className="bg-slate-50 py-12">
      <section className="mx-auto w-[min(94vw,560px)] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          Teach Idaho Access
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Teachers, students, volunteers, and admins can use the same login.
          Access to routes and tools is controlled by role.
        </p>
        {oauthReturnWithoutSession && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            <strong>Google sign-in didn’t finish on this site.</strong> PKCE
            needs the same browser session on <strong>one</strong> origin: start
            and finish &quot;Continue with Google&quot; on{" "}
            <strong>{window.location.origin}</strong> only (don’t mix localhost
            and production in one attempt). Also add this origin under Supabase
            → Authentication → URL Configuration → Redirect URLs. Try Google
            again—or try from another browser window.
          </p>
        )}
        {isAuthenticated && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            You are currently signed in.
          </p>
        )}
        <div className="mt-5 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setError(null);
              setMessage(null);
            }}
            className={`rounded-md px-3 py-1.5 font-semibold ${
              mode === "signin" ? "bg-white text-slate-900" : "text-slate-600"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setMessage(null);
            }}
            className={`rounded-md px-3 py-1.5 font-semibold ${
              mode === "signup" ? "bg-white text-slate-900" : "text-slate-600"
            }`}
          >
            Sign up
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {error && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </p>
          )}
          {!hasSupabaseCredentials && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Supabase credentials are not configured yet.
            </p>
          )}
          {mode === "signup" && signupRole === "student" && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              You&apos;re creating a <strong>student</strong> account to receive
              event announcements. After signing in, tap &quot;Receive student
              announcements&quot; on the event page.
            </p>
          )}
          {mode === "signup" && signupRole === "volunteer" && (
            <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
              You&apos;re creating a <strong>volunteer</strong> account. After
              signing in, finish subscribing on the event page.
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={!hasSupabaseCredentials}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {mode === "signin" ? "Continue with Google" : "Sign up with Google"}
          </button>
          {(signupRole === "student" || signupRole === "volunteer") && (
            <p className="text-center text-xs text-slate-500">
              Google sign-up defaults to a teacher profile; ask an admin if you
              need a {signupRole} role.
            </p>
          )}
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => onNavigate(safeRedirectTo)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              Continue
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
