import { useEffect, useMemo, useState } from "react";
import { AnnouncementThread } from "../../components/announcements/AnnouncementThread";
import RichTextDisplay from "../../components/richText/RichTextDisplay";
import RichTextEditor from "../../components/richText/RichTextEditor";
import { useAuth } from "../../hooks/useAuth";
import {
  createAnnouncement,
  listAllAnnouncements,
  listEvents,
  listSoftDeletedAnnouncementsAll,
  permanentlyDeleteAnnouncement,
  purgeExpiredSoftDeletedAnnouncements,
  restoreAnnouncement,
  softDeleteAnnouncement,
  updateAnnouncement,
  type AnnouncementAudience,
  type AnnouncementFeedItem,
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

function htmlToPlainText(html: string): string {
  if (typeof document === "undefined")
    return html.replace(/<[^>]+>/g, " ").trim();
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.textContent?.trim() ?? "";
}

function daysUntilPurge(deletedAt: string) {
  const end = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000;
  const days = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

export function AdminAnnouncementsPage() {
  const { userId, role } = useAuth();
  const isAdmin = role === "admin";
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [trash, setTrash] = useState<AnnouncementFeedItem[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [form, setForm] = useState<AnnouncementFormState>(initialForm);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadData() {
    const [all, nextEvents, deletedRows] = await Promise.all([
      listAllAnnouncements(),
      listEvents(),
      listSoftDeletedAnnouncementsAll(),
    ]);
    setAnnouncements(all);
    setEvents(nextEvents);
    setTrash(deletedRows);
  }

  useEffect(() => {
    void purgeExpiredSoftDeletedAnnouncements().catch(() => {});
  }, []);

  useEffect(() => {
    void loadData();
  }, []);

  const activePosts = useMemo(
    () => announcements.filter((a) => !a.deletedAt),
    [announcements],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !htmlToPlainText(form.body)) return;
    await createAnnouncement({
      title: form.title.trim(),
      body: form.body,
      audience: form.audience,
      eventId: form.eventId || null,
    });
    setForm(initialForm);
    await loadData();
  }

  async function handleSoftDelete(id: string) {
    if (
      !confirm(
        "Move this announcement to Recently deleted? It will be hidden from participants.",
      )
    ) {
      return;
    }
    setBusyId(id);
    try {
      await softDeleteAnnouncement(id);
      await loadData();
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(id: string) {
    setBusyId(id);
    try {
      await restoreAnnouncement(id);
      await loadData();
    } finally {
      setBusyId(null);
    }
  }

  async function handlePurgeForever(id: string) {
    if (
      !confirm(
        "Permanently delete this announcement and its comments? This cannot be undone.",
      )
    ) {
      return;
    }
    setBusyId(id);
    try {
      await permanentlyDeleteAnnouncement(id);
      await loadData();
    } finally {
      setBusyId(null);
    }
  }

  async function handleAudienceOnlyUpdate(
    id: string,
    audience: AnnouncementAudience,
  ) {
    setBusyId(id);
    try {
      await updateAnnouncement(id, { audience });
      await loadData();
    } finally {
      setBusyId(null);
    }
  }

  function eventLabel(eventId: string | null) {
    if (!eventId) return "—";
    return events.find((e) => e.id === eventId)?.name ?? eventId;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Site announcements
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-800">Public</span> with{" "}
          <em>no</em> event = truly everyone (including signed-out visitors for
          the feed). <span className="font-semibold text-slate-800">Public</span>{" "}
          with an <span className="font-semibold text-slate-800">event</span> =
          everyone who is &quot;in&quot; that event: submitted/approved teacher
          registrations, or student/volunteer subscriptions. Use role-specific
          audiences when you don&apos;t want cross-role visibility.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Create announcement</h2>
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input
            required
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({ ...current, title: event.target.value }))
            }
            placeholder="Title"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-600">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Audience
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
                <option value="public">Public (everyone)</option>
                <option value="teachers">Teachers</option>
                <option value="volunteers">Volunteers</option>
                <option value="students">Students</option>
                <option value="admins">Admins</option>
              </select>
            </label>
            <label className="block text-sm text-slate-600">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Event (optional)
              </span>
              <select
                value={form.eventId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, eventId: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">All events / org-wide</option>
                {events.map((eventItem) => (
                  <option key={eventItem.id} value={eventItem.id}>
                    {eventItem.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Body
            </span>
            <RichTextEditor
              value={form.body}
              onChange={(html) => setForm((c) => ({ ...c, body: html }))}
              rows={6}
              compact
              toolbarMode="always"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Post announcement
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Published</h2>
        {activePosts.map((announcement) => (
          <article
            key={announcement.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {announcement.title}
                  </h3>
                  <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {announcement.audience}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Event: {eventLabel(announcement.eventId)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <span className="sr-only">Change audience</span>
                  <select
                    value={announcement.audience}
                    disabled={busyId === announcement.id}
                    onChange={(e) =>
                      void handleAudienceOnlyUpdate(
                        announcement.id,
                        e.target.value as AnnouncementAudience,
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                  >
                    <option value="public">public</option>
                    <option value="teachers">teachers</option>
                    <option value="volunteers">volunteers</option>
                    <option value="students">students</option>
                    <option value="admins">admins</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={busyId === announcement.id}
                  onClick={() => void handleSoftDelete(announcement.id)}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
            <div className="mt-2 text-sm">
              <RichTextDisplay content={announcement.body} />
            </div>
            <AnnouncementThread
              announcementId={announcement.id}
              currentUserId={userId}
              isAdmin={isAdmin}
            />
            <p className="mt-2 text-xs text-slate-500">
              {new Date(announcement.createdAt).toLocaleString()}
            </p>
          </article>
        ))}
        {activePosts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            No published site announcements yet.
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900">Recently deleted</h2>
        <p className="text-sm text-slate-600">
          Restore to show again, or delete forever. Items may be auto-purged
          after about 30 days in the trash.
        </p>
        {trash.map((announcement) => (
          <article
            key={announcement.id}
            className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm"
          >
            {announcement.deletedAt ? (
              <p className="mb-2 text-xs font-medium text-amber-950">
                Auto-purge in ~{daysUntilPurge(announcement.deletedAt)} day(s) if
                not restored.
              </p>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {announcement.title}
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  {announcement.audience}
                  {announcement.eventName
                    ? ` · ${announcement.eventName}`
                    : announcement.eventId
                      ? ` · ${eventLabel(announcement.eventId)}`
                      : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busyId === announcement.id}
                  onClick={() => void handleRestore(announcement.id)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Restore
                </button>
                <button
                  type="button"
                  disabled={busyId === announcement.id}
                  onClick={() => void handlePurgeForever(announcement.id)}
                  className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50"
                >
                  Delete forever
                </button>
              </div>
            </div>
            <div className="mt-2 text-sm opacity-90">
              <RichTextDisplay content={announcement.body} />
            </div>
            <AnnouncementThread
              announcementId={announcement.id}
              currentUserId={userId}
              isAdmin={isAdmin}
            />
          </article>
        ))}
        {trash.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            Nothing in the trash.
          </p>
        ) : null}
      </div>
    </div>
  );
}
