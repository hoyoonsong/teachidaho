import { useEffect, useState } from "react";
import {
  createAnnouncement,
  listAnnouncementsForEvent,
  type AnnouncementAudience,
  type AnnouncementRecord,
} from "../../lib/appDataStore";

type AdminEventAnnouncementsPageProps = {
  eventId: string;
};

type AnnouncementFormState = {
  title: string;
  body: string;
  audience: AnnouncementAudience;
};

const initialForm: AnnouncementFormState = {
  title: "",
  body: "",
  audience: "teachers",
};

export function AdminEventAnnouncementsPage({ eventId }: AdminEventAnnouncementsPageProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [form, setForm] = useState<AnnouncementFormState>(initialForm);

  async function loadData() {
    const next = await listAnnouncementsForEvent(eventId);
    setAnnouncements(next);
  }

  useEffect(() => {
    void loadData();
  }, [eventId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createAnnouncement({
      title: form.title,
      body: form.body,
      audience: form.audience,
      eventId,
    });
    setForm(initialForm);
    await loadData();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Announcements
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Posts here are tied to this event only. Choose who can see each message
          (public, teachers, volunteers, or admins).
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">New announcement</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Title *
            </span>
            <input
              required
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({ ...current, title: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Audience *
            </span>
            <select
              value={form.audience}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  audience: event.target.value as AnnouncementAudience,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="public">Public</option>
              <option value="teachers">Teachers</option>
              <option value="volunteers">Volunteers</option>
              <option value="admins">Admins</option>
            </select>
          </label>
          <div className="hidden md:block" />
          <label className="block md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Body *
            </span>
            <textarea
              required
              rows={4}
              value={form.body}
              onChange={(event) =>
                setForm((current) => ({ ...current, body: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Post announcement
            </button>
          </div>
        </form>
      </div>
      <div className="space-y-3">
        {announcements.map((announcement) => (
          <article
            key={announcement.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{announcement.title}</h3>
              <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                {announcement.audience}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{announcement.body}</p>
            <p className="mt-2 text-xs text-slate-500">
              {new Date(announcement.createdAt).toLocaleString()}
            </p>
          </article>
        ))}
        {announcements.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            No announcements for this event yet.
          </p>
        )}
      </div>
    </div>
  );
}
