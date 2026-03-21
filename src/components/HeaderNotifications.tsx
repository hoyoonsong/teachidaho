import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  listAnnouncementFeedForRole,
  type AnnouncementFeedItem,
} from "../lib/appDataStore";

type HeaderNotificationsProps = {
  onNavigate: (to: string) => void;
};

function previewFromHtml(html: string, max = 88) {
  const t = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

export function HeaderNotifications({ onNavigate }: HeaderNotificationsProps) {
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AnnouncementFeedItem[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);

  const loadFeed = useCallback(async () => {
    const rows = await listAnnouncementFeedForRole(role, 14);
    setItems(rows);
  }, [role]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await listAnnouncementFeedForRole(role, 14);
      if (!cancelled) setItems(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (!open) return;
    void loadFeed();
  }, [open, loadFeed]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadFeed();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadFeed]);

  useEffect(() => {
    if (!open) return;
    function onDoc(ev: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const preview = items.slice(0, 7);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Announcements"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="h-5 w-5"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.671.01 2.75 1.165 3.841a.75.75 0 0 1-.44 1.284H4.525a.75.75 0 0 1-.44-1.284C5.24 12.5 5.25 12.421 5.25 9.75V9Zm4.5 0v.75c0 2.9-.001 3.044 1.657 4.722l.116.117a.75.75 0 0 0 .53.22H12a.75.75 0 0 0 .53-.22l.116-.117c1.658-1.678 1.657-1.822 1.657-4.722V9a3.75 3.75 0 1 0-7.5 0Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-[min(calc(100vw-1rem),19rem)] rounded-xl border border-slate-200 bg-white py-2 shadow-xl ring-1 ring-slate-900/5"
          role="menu"
        >
          <div className="border-b border-slate-100 px-3 pb-2 pt-0.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Recent
            </p>
          </div>
          <div className="max-h-[min(55vh,20rem)] overflow-y-auto">
            {preview.length === 0 ? (
              <p className="px-3 py-3 text-xs text-slate-500">
                No announcements for your account yet.
              </p>
            ) : (
              preview.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onNavigate("/announcements");
                  }}
                  className="block w-full border-b border-slate-50 px-3 py-2 text-left transition last:border-b-0 hover:bg-slate-50"
                >
                  <p className="text-sm font-semibold text-slate-900">
                    {a.title}
                  </p>
                  {a.eventName ? (
                    <p className="mt-0.5 text-[10px] font-medium text-emerald-800">
                      {a.eventName}
                    </p>
                  ) : null}
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">
                    {previewFromHtml(a.body)}
                  </p>
                </button>
              ))
            )}
          </div>
          <div className="border-t border-slate-100 px-2 py-1.5">
            <button
              type="button"
              className="w-full rounded-lg bg-slate-900 py-1.5 text-center text-xs font-semibold text-white transition hover:bg-slate-800"
              onClick={() => {
                setOpen(false);
                onNavigate("/announcements");
              }}
            >
              View all
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
