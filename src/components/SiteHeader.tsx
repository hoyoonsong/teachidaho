import { useState } from "react";
import logo from "../assets/teachidaho-logo.png";

type SiteHeaderProps = {
  currentPath: string;
  onNavigate: (to: string) => void;
};

export function SiteHeader({ currentPath, onNavigate }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = [
    { href: "/", label: "Home" },
    { href: "/gallery", label: "Gallery" },
    { href: "/econsummit", label: "Econ Summit" },
    { href: "/pitch-competition", label: "Pitch Competition" },
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
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 md:hidden"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
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
          </nav>
        </div>
      )}
    </header>
  );
}
