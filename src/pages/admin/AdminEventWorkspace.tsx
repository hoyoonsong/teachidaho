import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  AdminShell,
  type AdminEventSection,
} from "../../components/admin/AdminShell";
import { getEventById, type EventRecord } from "../../lib/appDataStore";
import { AdminEventAnnouncementsPage } from "./AdminEventAnnouncementsPage";
import { AdminEventOverviewPage } from "./AdminEventOverviewPage";
import { AdminEventRegistrationsPage } from "./AdminEventRegistrationsPage";
import { AdminEventScoreboardPage } from "./AdminEventScoreboardPage";

type AdminEventWorkspaceProps = {
  eventId: string;
  section: AdminEventSection;
  onNavigate: (to: string) => void;
};

export function AdminEventWorkspace({
  eventId,
  section,
  onNavigate,
}: AdminEventWorkspaceProps) {
  const [event, setEvent] = useState<EventRecord | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const row = await getEventById(eventId);
      if (!cancelled) {
        setEvent(row);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const refreshEvent = useCallback(() => {
    void getEventById(eventId).then((row) => setEvent(row));
  }, [eventId]);

  let page: ReactNode;
  if (!loaded) {
    page = (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-600">Loading event…</p>
      </div>
    );
  } else if (!event) {
    page = (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
        Event not found.
      </div>
    );
  } else if (section === "overview") {
    page = <AdminEventOverviewPage eventId={eventId} onSaved={refreshEvent} />;
  } else if (section === "registrations") {
    page = <AdminEventRegistrationsPage eventId={eventId} />;
  } else if (section === "announcements") {
    page = <AdminEventAnnouncementsPage eventId={eventId} />;
  } else {
    page = <AdminEventScoreboardPage eventId={eventId} />;
  }

  return (
    <AdminShell
      mode="event"
      onNavigate={onNavigate}
      eventId={eventId}
      eventName={!loaded ? null : event?.name ?? "Event not found"}
      activeSection={section}
    >
      {page}
    </AdminShell>
  );
}
