import { useEffect, useState } from "react";
import {
  listAllAnnouncements,
  listEvents,
  listFormSubmissions,
  listMemberships,
  type AnnouncementRecord,
  type EventRecord,
  type EventMembershipRecord,
  type FormSubmissionRecord,
} from "../../lib/appDataStore";

export function AdminDashboardPage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [submissions, setSubmissions] = useState<FormSubmissionRecord[]>([]);
  const [memberships, setMemberships] = useState<EventMembershipRecord[]>([]);

  useEffect(() => {
    async function loadData() {
      const [nextEvents, nextAnnouncements, nextSubmissions, nextMemberships] =
        await Promise.all([
          listEvents(),
          listAllAnnouncements(),
          listFormSubmissions(),
          listMemberships(),
        ]);
      setEvents(nextEvents);
      setAnnouncements(nextAnnouncements);
      setSubmissions(nextSubmissions);
      setMemberships(nextMemberships);
    }
    loadData();
  }, []);

  const activeEvents = events.filter((event) => event.status === "active").length;
  const pendingSubmissions = submissions.filter(
    (submission) => submission.status === "pending",
  ).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
          Admin Overview
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          Classroom Operations
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Canvas/Classroom style control center for events, forms, announcements,
          and scoring.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Active events
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">{activeEvents}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Pending registrations
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {pendingSubmissions}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Announcements
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {announcements.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Event memberships
          </p>
          <p className="mt-2 text-3xl font-black text-slate-900">
            {memberships.length}
          </p>
        </div>
      </div>
    </div>
  );
}
