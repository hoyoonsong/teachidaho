import { useEffect, useState } from "react";
import { AnnouncementThread } from "../components/announcements/AnnouncementThread";
import RichTextDisplay from "../components/richText/RichTextDisplay";
import { useAuth } from "../hooks/useAuth";
import {
  listAnnouncementFeedForRole,
  type AnnouncementFeedItem,
} from "../lib/appDataStore";

type AnnouncementsFeedPageProps = {
  onNavigate: (to: string) => void;
};

export function AnnouncementsFeedPage({
  onNavigate,
}: AnnouncementsFeedPageProps) {
  const { role, userId } = useAuth();
  const isAdmin = role === "admin";
  const [items, setItems] = useState<AnnouncementFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const rows = await listAnnouncementFeedForRole(role, 80);
      if (!cancelled) {
        setItems(rows);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role]);

  return (
    <main className="mx-auto w-[min(94vw,720px)] px-4 py-10 sm:px-6 lg:px-10">
      <button
        type="button"
        onClick={() => onNavigate("/")}
        className="text-sm font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
      >
        ← Home
      </button>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-emerald-700">
        Updates
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
        Announcements
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        <span className="font-semibold text-slate-800">Site-wide public</span>{" "}
        posts (no event) are visible to everyone. If a post is{" "}
        <span className="font-semibold text-slate-800">public</span> but tied to
        an event, you only see it after you&apos;re in that event:{" "}
        <span className="font-semibold text-slate-800">teachers</span> via
        submitted registration,{" "}
        <span className="font-semibold text-slate-800">students</span> and{" "}
        <span className="font-semibold text-slate-800">volunteers</span> via the
        event subscribe page. Role-specific (teacher/student/volunteer) posts
        follow the same event rules. Sign in to comment.
      </p>

      {loading ? (
        <p className="mt-10 text-sm font-semibold text-slate-600">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No announcements to show yet.
        </p>
      ) : (
        <ul className="mt-8 space-y-4">
          {items.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">{a.title}</h2>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  {a.audience}
                </span>
              </div>
              {a.eventName ? (
                <p className="mt-1 text-sm font-semibold text-emerald-800">
                  {a.eventName}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500">
                {new Date(a.createdAt).toLocaleString()}
              </p>
              <div className="mt-3 text-sm text-slate-700">
                <RichTextDisplay content={a.body} />
              </div>
              <AnnouncementThread
                announcementId={a.id}
                currentUserId={userId}
                isAdmin={isAdmin}
              />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
