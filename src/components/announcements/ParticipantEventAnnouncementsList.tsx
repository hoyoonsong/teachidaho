import { useCallback, useEffect, useState } from "react";
import { AnnouncementThread } from "./AnnouncementThread";
import RichTextDisplay from "../richText/RichTextDisplay";
import {
  listAnnouncementFeedForEvent,
  type AnnouncementFeedItem,
} from "../../lib/appDataStore";
import type { UserRole } from "../../types/auth";

type ParticipantEventAnnouncementsListProps = {
  eventId: string;
  /** Role used for audience filtering (same as access check). */
  role: UserRole | null;
  currentUserId: string | null;
  isAdmin: boolean;
  /** Bump to refetch after subscribe/unsubscribe. */
  refreshKey?: number;
};

export function ParticipantEventAnnouncementsList({
  eventId,
  role,
  currentUserId,
  isAdmin,
  refreshKey = 0,
}: ParticipantEventAnnouncementsListProps) {
  const [items, setItems] = useState<AnnouncementFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listAnnouncementFeedForEvent(eventId, role);
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load announcements.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [eventId, role]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  if (loading) {
    return (
      <p className="text-sm font-medium text-slate-500">Loading announcements…</p>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
        {error}
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-500">
        No announcements for this event yet. Check back later.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {items.map((a) => (
        <li
          key={a.id}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-900">{a.title}</h3>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
              {a.audience}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {new Date(a.createdAt).toLocaleString()}
          </p>
          <div className="mt-3 text-sm text-slate-700">
            <RichTextDisplay content={a.body} />
          </div>
          <AnnouncementThread
            announcementId={a.id}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
          />
        </li>
      ))}
    </ul>
  );
}
