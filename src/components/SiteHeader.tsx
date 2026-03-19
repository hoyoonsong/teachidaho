import { useState } from "react";
import logo from "../assets/teachidaho-logo.png";
import type { UserRole } from "../types/auth";

type SiteHeaderProps = {
  currentPath: string;
  onNavigate: (to: string) => void;
  role: UserRole | null;
  isAuthenticated: boolean;
  onSignOut: () => Promise<void>;
};

export function SiteHeader({
  currentPath,
  onNavigate,
  role,
  isAuthenticated,
  onSignOut,
}: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const loginRedirectTarget =
    currentPath === "/login"
      ? "/"
      : `/login?redirectTo=${encodeURIComponent(currentPath)}`;
  const links = [
    { href: "/", label: "Home" },
    //{ href: "/gallery", label: "Gallery" },
    { href: "/info/econsummit", label: "Econ Summit" },
    { href: "/info/pitch-competition", label: "Pitch Competition" },
    { href: "/participants", label: "Participants" },
    ...(role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

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
        <nav className="hidden gap-5 text-sm font-medium text-slate-600 md:flex">
          {links.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => onNavigate(link.href)}
              className={`transition hover:text-slate-900 ${
                currentPath === link.href ? "text-slate-900" : ""
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
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
                  currentPath === link.href ? "bg-slate-100 text-slate-900" : ""
                }`}
              >
                {link.label}
              </button>
            ))}
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
