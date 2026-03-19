import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "./components/admin/AdminShell";
import { ContactButtons } from "./components/ContactButtons";
import { SiteFooter } from "./components/SiteFooter";
import { SiteHeader } from "./components/SiteHeader";
import { useAuth } from "./hooks/useAuth";
import {
  buildMixedGallery,
  homeMenuImages,
  homeMissionImages,
} from "./data/galleryData";
import { LoginPage } from "./pages/LoginPage";
import { EconSummitPage } from "./pages/EconSummitPage";
import { GalleryPage } from "./pages/GalleryPage";
import { HomePage } from "./pages/HomePage";
import { ParticipantsPage } from "./pages/ParticipantsPage";
import { ParticipantsRegisterPage } from "./pages/ParticipantsRegisterPage";
import { PitchCompetitionPage } from "./pages/PitchCompetitionPage";
import { AdminAnnouncementsPage } from "./pages/admin/AdminAnnouncementsPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminEventsPage } from "./pages/admin/AdminEventsPage";
import { AdminRegistrationsPage } from "./pages/admin/AdminRegistrationsPage";
import { AdminScoreboardPage } from "./pages/admin/AdminScoreboardPage";
import type { UserRole } from "./types/auth";

function App() {
  const [location, setLocation] = useState({
    pathname: window.location.pathname,
    search: window.location.search,
  });
  const mixedGallery = useMemo(() => buildMixedGallery(), []);
  const { isLoading, isAuthenticated, role, signOut, refreshRole } = useAuth();

  useEffect(() => {
    const handlePopState = () =>
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
      });
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (to: string) => {
    const target = new URL(to, window.location.origin);
    const next = `${target.pathname}${target.search}`;
    const current = `${location.pathname}${location.search}`;
    if (next === current) return;
    window.history.pushState({}, "", next);
    setLocation({ pathname: target.pathname, search: target.search });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const path = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const isAdminPath = path === "/admin" || path.startsWith("/admin/");
  const needsAuthGate =
    path === "/login" || path === "/participants/register" || isAdminPath;

  const isKnownPath = [
    "/",
    "/login",
    "/gallery",
    "/info/econsummit",
    "/info/pitch-competition",
    "/participants",
    "/participants/register",
    "/admin",
    "/admin/events",
    "/admin/registrations",
    "/admin/announcements",
    "/admin/scoreboard",
  ].includes(path);

  function accessDeniedView(allowedRoles: UserRole[]) {
    if (isAuthenticated && role === null) {
      return (
        <main className="mx-auto w-[min(94vw,720px)] px-6 py-16">
          <p className="text-sm font-semibold text-slate-600">
            Checking account permissions...
          </p>
        </main>
      );
    }

    if (!isAuthenticated) {
      return (
        <main className="mx-auto w-[min(94vw,720px)] px-6 py-16">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h1 className="text-2xl font-black text-amber-900">Login required</h1>
            <p className="mt-2 text-sm text-amber-900/90">
              This page is restricted. Sign in to continue.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/login?redirectTo=${encodeURIComponent(path)}`)}
              className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Go to login
            </button>
          </div>
        </main>
      );
    }

    return (
      <main className="mx-auto w-[min(94vw,720px)] px-6 py-16">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
          <h1 className="text-2xl font-black text-rose-900">Access denied</h1>
          <p className="mt-2 text-sm text-rose-900/90">
            This page requires one of the following roles:{" "}
            {allowedRoles.join(", ")}.
          </p>
          <p className="mt-1 text-sm text-rose-900/90">
            Current account role: {role ?? "unresolved"}.
          </p>
        </div>
      </main>
    );
  }

  function renderAdminPage() {
    if (role !== "admin") {
      return accessDeniedView(["admin"]);
    }

    let pageNode = <AdminDashboardPage />;
    if (path === "/admin/events") pageNode = <AdminEventsPage />;
    if (path === "/admin/registrations") pageNode = <AdminRegistrationsPage />;
    if (path === "/admin/announcements") pageNode = <AdminAnnouncementsPage />;
    if (path === "/admin/scoreboard") pageNode = <AdminScoreboardPage />;

    return (
      <AdminShell currentPath={path} onNavigate={navigate}>
        {pageNode}
      </AdminShell>
    );
  }

  useEffect(() => {
    if (isAuthenticated && role === null) {
      void refreshRole();
    }
  }, [isAuthenticated, refreshRole, role]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <SiteHeader
        currentPath={path}
        onNavigate={navigate}
        role={role}
        isAuthenticated={isAuthenticated}
        onSignOut={handleSignOut}
      />
      <div className="flex-1">
        {isLoading && needsAuthGate && (
          <main className="mx-auto w-[min(94vw,720px)] px-6 py-16">
            <p className="text-sm font-semibold text-slate-600">Loading account...</p>
          </main>
        )}
        {!isLoading && path === "/login" && (
          <LoginPage onNavigate={navigate} redirectTo={redirectTo} />
        )}
        {!isLoading && isAdminPath && renderAdminPage()}
        {!isLoading && path === "/participants/register" && (
          role === "teacher" || role === "admin" ? (
            <ParticipantsRegisterPage />
          ) : (
            accessDeniedView(["teacher", "admin"])
          )
        )}
        {path === "/" && (
          <HomePage
            onNavigate={navigate}
            menuImages={homeMenuImages}
            missionImages={homeMissionImages}
          />
        )}
        {path === "/gallery" && <GalleryPage mixedGallery={mixedGallery} />}
        {path === "/info/econsummit" && <EconSummitPage />}
        {path === "/info/pitch-competition" && <PitchCompetitionPage />}
        {path === "/participants" && <ParticipantsPage onNavigate={navigate} />}
        {!isKnownPath && (
          <main className="mx-auto max-w-5xl px-6 py-20">
            <h1 className="text-4xl font-black text-slate-900">
              Page not found
            </h1>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-5 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
            >
              Back to Home
            </button>
          </main>
        )}
        {path === "/" && !isAdminPath && <ContactButtons />}
      </div>
      <SiteFooter />
    </div>
  );
}

export default App;
