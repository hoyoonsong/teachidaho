import { useEffect, useRef, useState } from "react";
import logo from "../assets/teachidaho-logo.png";
import type { UserRole } from "../types/auth";
import { HeaderNotifications } from "./HeaderNotifications";

type SiteHeaderProps = {
  currentPath: string;
  onNavigate: (to: string) => void;
  role: UserRole | null;
  isAuthenticated: boolean;
  onSignOut: () => Promise<void>;
};

const ADMIN_MENU: { href: string; label: string }[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/announcements", label: "Site announcements" },
];

export function SiteHeader({
  currentPath,
  onNavigate,
  role,
  isAuthenticated,
  onSignOut,
}: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);
  const adminWrapRef = useRef<HTMLDivElement>(null);

  const loginRedirectTarget =
    currentPath === "/login"
      ? "/"
      : `/login?redirectTo=${encodeURIComponent(currentPath)}`;

  const links: { href: string; label: string }[] = [
    { href: "/", label: "Home" },
    { href: "/info/econsummit", label: "Econ Summit" },
    { href: "/info/pitch-competition", label: "Pitch Competition" },
    { href: "/participants", label: "Participants" },
  ];

  const adminPathActive = currentPath.startsWith("/admin");

  useEffect(() => {
    if (!adminMenuOpen) return;
    function onDoc(e: MouseEvent) {
      const el = adminWrapRef.current;
      if (el && !el.contains(e.target as Node)) setAdminMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [adminMenuOpen]);

  function linkIsActive(href: string) {
    if (href === "/participants")
      return currentPath.startsWith("/participants");
    return currentPath === href;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3 lg:px-8">
        <button
          type="button"
          onClick={() => onNavigate("/")}
          className="shrink-0"
        >
          <img
            src={logo}
            alt="Teach Idaho logo"
            className="h-9 w-auto sm:h-16"
          />
        </button>
        <nav className="hidden gap-5 text-sm font-medium text-slate-600 md:flex md:items-center">
          {links.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => onNavigate(link.href)}
              className={`transition hover:text-slate-900 ${
                linkIsActive(link.href) ? "text-slate-900" : ""
              }`}
            >
              {link.label}
            </button>
          ))}
          {role === "admin" ? (
            <div className="relative" ref={adminWrapRef}>
              <button
                type="button"
                onClick={() => setAdminMenuOpen((o) => !o)}
                aria-expanded={adminMenuOpen}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-1 transition hover:text-slate-900 ${
                  adminPathActive ? "text-slate-900" : ""
                }`}
              >
                Admin
                <span className="text-slate-400" aria-hidden>
                  ▾
                </span>
              </button>
              {adminMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-40 mt-2 min-w-[12rem] rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {ADMIN_MENU.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onNavigate(item.href);
                        setAdminMenuOpen(false);
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </nav>
        <div className="flex items-center gap-2">
          <HeaderNotifications
            onNavigate={(to) => {
              onNavigate(to);
              setMobileOpen(false);
            }}
          />
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => void onSignOut()}
              className="hidden rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 md:inline-flex"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate(loginRedirectTarget)}
              className="hidden rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 md:inline-flex"
            >
              Login
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 md:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-6 py-3 md:hidden">
          <nav className="flex flex-col gap-2 text-sm font-medium text-slate-700">
            {links.map((link) => (
              <button
                key={link.href}
                type="button"
                onClick={() => {
                  onNavigate(link.href);
                  setMobileOpen(false);
                }}
                className={`rounded-md px-2 py-2 text-left transition hover:bg-slate-100 ${
                  linkIsActive(link.href) ? "bg-slate-100 text-slate-900" : ""
                }`}
              >
                {link.label}
              </button>
            ))}
            {role === "admin" ? (
              <div className="border-t border-slate-100 pt-2">
                <button
                  type="button"
                  onClick={() => setMobileAdminOpen((o) => !o)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-2 text-left transition hover:bg-slate-100 ${
                    adminPathActive ? "bg-slate-100 text-slate-900" : ""
                  }`}
                >
                  <span>Admin</span>
                  <span className="text-slate-400">{mobileAdminOpen ? "▴" : "▾"}</span>
                </button>
                {mobileAdminOpen ? (
                  <div className="ml-2 mt-1 flex flex-col gap-1 border-l-2 border-slate-200 pl-3">
                    {ADMIN_MENU.map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => {
                          onNavigate(item.href);
                          setMobileOpen(false);
                          setMobileAdminOpen(false);
                        }}
                        className="rounded-md px-2 py-1.5 text-left text-sm text-slate-600 hover:bg-slate-50"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  void onSignOut();
                  setMobileOpen(false);
                }}
                className="rounded-md border border-slate-300 px-2 py-2 text-left transition hover:bg-slate-100"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onNavigate(loginRedirectTarget);
                  setMobileOpen(false);
                }}
                className="rounded-md border border-slate-300 px-2 py-2 text-left transition hover:bg-slate-100"
              >
                Login
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
