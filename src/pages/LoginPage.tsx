import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { hasSupabaseCredentials, supabase } from "../lib/supabase";

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
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    hasSupabaseCredentials,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  /** Shown when Google returns ?code= but PKCE didn’t complete (e.g. started OAuth on another origin). */
  const [oauthReturnWithoutSession, setOauthReturnWithoutSession] =
    useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  }, []);

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

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      setOauthReturnWithoutSession(false);
      return;
    }
    const sp = new URLSearchParams(window.location.search);
    setOauthReturnWithoutSession(Boolean(sp.get("code")));
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (signupRole === "student" || signupRole === "volunteer") {
      setMode("signup");
    }
  }, [signupRole]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const nextError =
      mode === "signin"
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password, fullName, {
            signupRole: signupRole ?? "teacher",
          });

    setIsSubmitting(false);

    if (nextError) {
      setError(nextError);
      return;
    }

    if (mode === "signup") {
      setMessage(
        "Account created. If email confirmation is enabled, check your inbox before signing in.",
      );
      setMode("signin");
      return;
    }

    onNavigate(safeRedirectTo);
  }

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
            needs the same browser session on <strong>one</strong> origin:
            start and finish &quot;Continue with Google&quot; on{" "}
            <strong>{window.location.origin}</strong> only (don’t mix localhost
            and production in one attempt). Also add this origin under
            Supabase → Authentication → URL Configuration → Redirect URLs. Try
            Google again—or use email and password below.
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

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          {mode === "signup" && signupRole === "student" && (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
              You&apos;re creating a <strong>student</strong> account to receive
              event announcements. After confirming email (if required), sign in
              and tap &quot;Receive student announcements&quot; on the event
              page.
            </p>
          )}
          {mode === "signup" && signupRole === "volunteer" && (
            <p className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-900">
              You&apos;re creating a <strong>volunteer</strong> account. After
              signing in, finish subscribing on the event page.
            </p>
          )}
          {mode === "signup" && (
            <label className="block text-sm font-medium text-slate-700">
              Full name
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                type="text"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Your full name"
              />
            </label>
          )}
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="you@school.org"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="••••••••"
              required
            />
          </label>
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
              Supabase credentials are not configured yet. You can still preview
              role-based flows with the buttons below.
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting
              ? mode === "signin"
                ? "Signing in..."
                : "Creating account..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={!hasSupabaseCredentials}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            Continue with Google
          </button>
          {(signupRole === "student" || signupRole === "volunteer") && (
            <p className="text-center text-xs text-slate-500">
              Google sign-up defaults to a teacher profile. For a {signupRole}{" "}
              account, use email + password above.
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
        </form>
      </section>
    </main>
  );
}
