import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminShell,
  type AdminEventSection,
} from "./components/admin/AdminShell";
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
import { AnnouncementsFeedPage } from "./pages/AnnouncementsFeedPage";
import { AdminEventsPage } from "./pages/admin/AdminEventsPage";
import { AdminEventWorkspace } from "./pages/admin/AdminEventWorkspace";
import { AdminHubPage } from "./pages/admin/AdminHubPage";
import { AdminAnnouncementsPage } from "./pages/admin/AdminAnnouncementsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import {
  ParticipantEventWorkspace,
  type ParticipantEventSection,
} from "./pages/ParticipantEventWorkspace";
import { EventAnnouncementsSubscribePage } from "./pages/EventAnnouncementsSubscribePage";
import type { UserRole } from "./types/auth";

function parseParticipantEventSubscribeRoute(pathname: string): {
  eventId: string;
  volunteerOnly: boolean;
} | null {
  const v = pathname.match(
    /^\/participants\/event\/([^/]+)\/subscribe\/volunteer$/,
  );
  if (v) return { eventId: v[1], volunteerOnly: true };
  const m = pathname.match(/^\/participants\/event\/([^/]+)\/subscribe$/);
  return m ? { eventId: m[1], volunteerOnly: false } : null;
}

function parseSignupRole(
  raw: string | null,
): "teacher" | "student" | "volunteer" | undefined {
  if (raw === "student" || raw === "volunteer" || raw === "teacher") return raw;
  return undefined;
}

function parseEventAdminRoute(pathname: string): {
  eventId: string;
  section: AdminEventSection;
} | null {
  const match = pathname.match(
    /^\/admin\/events\/([^/]+)\/(overview|registrations|announcements|scoreboard|volunteers)$/,
  );
  if (!match) return null;
  return { eventId: match[1], section: match[2] as AdminEventSection };
}

function isAdminPathKnown(pathname: string): boolean {
  if (pathname === "/admin" || pathname === "/admin/events") return true;
  if (pathname === "/admin/users") return true;
  if (pathname === "/admin/announcements") return true;
  return parseEventAdminRoute(pathname) !== null;
}

function parseParticipantEventRoute(pathname: string): {
  eventId: string;
  section: ParticipantEventSection;
} | null {
  const m = pathname.match(
    /^\/participants\/event\/([^/]+)(?:\/(scoreboard|overview|announcements))?$/,
  );
  if (!m) return null;
  const section: ParticipantEventSection =
    m[2] === "scoreboard" ? "scoreboard" : "dashboard";
  return { eventId: m[1], section };
}

/** Old global admin URLs → normalized to event hub. */
const LEGACY_ADMIN_PATHS: readonly string[] = [
  "/admin/registrations",
  "/admin/scoreboard",
];

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

  const navigate = useCallback(
    (to: string) => {
      const target = new URL(to, window.location.origin);
      const next = `${target.pathname}${target.search}`;
      const current = `${location.pathname}${location.search}`;
      if (next === current) return;
      window.history.pushState({}, "", next);
      setLocation({ pathname: target.pathname, search: target.search });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [location.pathname, location.search],
  );

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

  const participantEventRoute = parseParticipantEventRoute(path);
  const participantSubscribeRoute = parseParticipantEventSubscribeRoute(path);
  const signupRoleHint = parseSignupRole(searchParams.get("signupRole"));

  const isKnownPath =
    [
      "/",
      "/login",
      "/gallery",
      "/announcements",
      "/info/econsummit",
      "/info/pitch-competition",
      "/participants",
      "/participants/register",
    ].includes(path) ||
    isAdminPathKnown(path) ||
    participantEventRoute !== null ||
    participantSubscribeRoute !== null;

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
            <h1 className="text-2xl font-black text-amber-900">
              Login required
            </h1>
            <p className="mt-2 text-sm text-amber-900/90">
              This page is restricted. Sign in to continue.
            </p>
            <button
              type="button"
              onClick={() =>
                navigate(`/login?redirectTo=${encodeURIComponent(path)}`)
              }
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

    if (path === "/admin") {
      return (
        <AdminShell mode="hub" onNavigate={navigate}>
          <AdminHubPage onNavigate={navigate} />
        </AdminShell>
      );
    }

    if (path === "/admin/users") {
      return (
        <AdminShell mode="hub" onNavigate={navigate}>
          <AdminUsersPage onNavigate={navigate} />
        </AdminShell>
      );
    }

    if (path === "/admin/announcements") {
      return (
        <AdminShell mode="hub" onNavigate={navigate}>
          <AdminAnnouncementsPage />
        </AdminShell>
      );
    }

    const eventRoute = parseEventAdminRoute(path);
    if (eventRoute) {
      return (
        <AdminEventWorkspace
          key={eventRoute.eventId}
          eventId={eventRoute.eventId}
          section={eventRoute.section}
          onNavigate={navigate}
        />
      );
    }

    return (
      <AdminShell mode="hub" onNavigate={navigate}>
        <AdminEventsPage onNavigate={navigate} />
      </AdminShell>
    );
  }

  useEffect(() => {
    if (isAuthenticated && role === null) {
      void refreshRole();
    }
  }, [isAuthenticated, refreshRole, role]);

  useEffect(() => {
    if (!isAdminPath) return;
    if (!LEGACY_ADMIN_PATHS.includes(path)) return;
    queueMicrotask(() => navigate("/admin/events"));
  }, [isAdminPath, path, navigate]);

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
        {/** /login must mount during OAuth (?code=) even while auth is still bootstrapping, or redirect never runs. */}
        {path === "/login" && (
          <LoginPage
            key={signupRoleHint ?? "default"}
            onNavigate={navigate}
            redirectTo={redirectTo}
            signupRole={signupRoleHint}
          />
        )}
        {isLoading && needsAuthGate && path !== "/login" && (
          <main className="mx-auto w-[min(94vw,720px)] px-6 py-16">
            <p className="text-sm font-semibold text-slate-600">
              Loading account...
            </p>
          </main>
        )}
        {!isLoading && isAdminPath && renderAdminPage()}
        {!isLoading &&
          path === "/participants/register" &&
          (role === "teacher" || role === "admin" ? (
            <ParticipantsRegisterPage onNavigate={navigate} />
          ) : (
            accessDeniedView(["teacher", "admin"])
          ))}
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
        {!isLoading && participantSubscribeRoute && (
          <EventAnnouncementsSubscribePage
            key={`${participantSubscribeRoute.eventId}-${participantSubscribeRoute.volunteerOnly ? "v" : "p"}`}
            eventId={participantSubscribeRoute.eventId}
            onNavigate={navigate}
            volunteerLink={participantSubscribeRoute.volunteerOnly}
          />
        )}
        {!isLoading && participantEventRoute && (
          <ParticipantEventWorkspace
            key={participantEventRoute.eventId}
            eventId={participantEventRoute.eventId}
            section={participantEventRoute.section}
            onNavigate={navigate}
            locationPath={path}
          />
        )}
        {path === "/participants" && <ParticipantsPage onNavigate={navigate} />}
        {path === "/announcements" && (
          <AnnouncementsFeedPage onNavigate={navigate} />
        )}
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
