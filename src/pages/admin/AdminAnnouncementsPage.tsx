import { useEffect, useState } from "react";
import {
  createAnnouncement,
  listAllAnnouncements,
  listEvents,
  type AnnouncementAudience,
  type AnnouncementRecord,
  type EventRecord,
} from "../../lib/appDataStore";

type AnnouncementFormState = {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  eventId: string;
};

const initialForm: AnnouncementFormState = {
  title: "",
  body: "",
  audience: "public",
  eventId: "",
};

export function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [form, setForm] = useState<AnnouncementFormState>(initialForm);

  async function loadData() {
    const [nextAnnouncements, nextEvents] = await Promise.all([
      listAllAnnouncements(),
      listEvents(),
    ]);
    setAnnouncements(nextAnnouncements);
    setEvents(nextEvents);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await createAnnouncement({
      title: form.title,
      body: form.body,
      audience: form.audience,
      eventId: form.eventId || null,
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
          Publish updates to public audiences or role-specific feeds.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Create announcement</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <input
            required
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="Title"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
          <select
            value={form.audience}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                audience: event.target.value as AnnouncementAudience,
              }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="public">Public</option>
            <option value="teachers">Teachers</option>
            <option value="volunteers">Volunteers</option>
            <option value="admins">Admins</option>
          </select>
          <select
            value={form.eventId}
            onChange={(event) =>
              setForm((current) => ({ ...current, eventId: event.target.value }))
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All events</option>
            {events.map((eventItem) => (
              <option key={eventItem.id} value={eventItem.id}>
                {eventItem.name}
              </option>
            ))}
          </select>
          <textarea
            required
            rows={4}
            value={form.body}
            onChange={(event) =>
              setForm((current) => ({ ...current, body: event.target.value }))
            }
            placeholder="Announcement body"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
          />
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
      </div>
    </div>
  );
}
