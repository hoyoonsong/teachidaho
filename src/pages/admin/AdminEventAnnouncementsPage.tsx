import { useEffect, useState } from "react";
import RichTextEditor from "../../components/richText/RichTextEditor";
import { PencilIconButton } from "../../components/ui/PencilIconButton";
import RichTextDisplay from "../../components/richText/RichTextDisplay";
import {
  createAnnouncement,
  listAnnouncementsForEvent,
  purgeExpiredSoftDeletedAnnouncements,
  restoreAnnouncement,
  softDeleteAnnouncement,
  updateAnnouncement,
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

function htmlToPlainText(html: string): string {
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ").trim();
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.textContent?.trim() ?? "";
}

function daysUntilPurge(deletedAt: string) {
  const end = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000;
  const days = Math.ceil((end - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, days);
}

export function AdminEventAnnouncementsPage({ eventId }: AdminEventAnnouncementsPageProps) {
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [form, setForm] = useState<AnnouncementFormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AnnouncementFormState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadData() {
    const next = await listAnnouncementsForEvent(eventId);
    setAnnouncements(next);
  }

  useEffect(() => {
    void purgeExpiredSoftDeletedAnnouncements().catch(() => {});
  }, []);

  useEffect(() => {
    void loadData();
  }, [eventId]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !htmlToPlainText(form.body)) return;
    await createAnnouncement({
      title: form.title,
      body: form.body,
      audience: form.audience,
      eventId,
    });
    setForm(initialForm);
    await loadData();
  }

  async function handleSaveEdit(id: string) {
    if (!editDraft) return;
    if (!editDraft.title.trim() || !htmlToPlainText(editDraft.body)) return;
    setBusyId(id);
    try {
      await updateAnnouncement(id, {
        title: editDraft.title,
        body: editDraft.body,
        audience: editDraft.audience,
      });
      setEditingId(null);
      setEditDraft(null);
      await loadData();
    } finally {
      setBusyId(null);
    }
  }

  async function handleSoftDelete(id: string) {
    if (!confirm("Soft-delete this announcement? It will disappear for participants for up to 30 days, then be removed permanently.")) {
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

  function startEdit(a: AnnouncementRecord) {
    setEditingId(a.id);
    setEditDraft({
      title: a.title,
      body: a.body,
      audience: a.audience,
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Announcements</h1>
        <p className="mt-1 text-sm text-slate-600">
          Posts are scoped to this event. Use bold and links in the body. Deleting is soft: posts
          stay hidden for 30 days, then are purged automatically.
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
          <div className="md:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Body *
            </span>
            <RichTextEditor
              value={form.body}
              onChange={(html) => setForm((c) => ({ ...c, body: html }))}
              rows={5}
              compact
              toolbarMode="always"
            />
          </div>
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
        {announcements.map((announcement) => {
          const isEditing = editingId === announcement.id;
          const isDeleted = Boolean(announcement.deletedAt);

          return (
            <article
              key={announcement.id}
              className={`rounded-xl border bg-white p-4 shadow-sm ${
                isDeleted ? "border-amber-300 bg-amber-50/40" : "border-slate-200"
              }`}
            >
              {isDeleted && announcement.deletedAt && (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-100/80 px-3 py-2 text-xs font-medium text-amber-950">
                  Soft-deleted — permanently removed in ~{daysUntilPurge(announcement.deletedAt)}{" "}
                  day(s). Restore to publish again.
                </p>
              )}
              {isEditing && editDraft ? (
                <div className="space-y-3">
                  <input
                    value={editDraft.title}
                    onChange={(e) =>
                      setEditDraft((d) => (d ? { ...d, title: e.target.value } : d))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                  />
                  <select
                    value={editDraft.audience}
                    onChange={(e) =>
                      setEditDraft((d) =>
                        d ? { ...d, audience: e.target.value as AnnouncementAudience } : d,
                      )
                    }
                    className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="public">Public</option>
                    <option value="teachers">Teachers</option>
                    <option value="volunteers">Volunteers</option>
                    <option value="admins">Admins</option>
                  </select>
                  <RichTextEditor
                    value={editDraft.body}
                    onChange={(html) =>
                      setEditDraft((d) => (d ? { ...d, body: html } : d))
                    }
                    rows={5}
                    compact
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === announcement.id}
                      onClick={() => void handleSaveEdit(announcement.id)}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setEditDraft(null);
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{announcement.title}</h3>
                      <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {announcement.audience}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isDeleted ? (
                        <button
                          type="button"
                          disabled={busyId === announcement.id}
                          onClick={() => void handleRestore(announcement.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Restore
                        </button>
                      ) : (
                        <>
                          <PencilIconButton
                            onClick={() => startEdit(announcement)}
                            label={`Edit announcement: ${announcement.title}`}
                          />
                          <button
                            type="button"
                            disabled={busyId === announcement.id}
                            onClick={() => void handleSoftDelete(announcement.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
                    <RichTextDisplay content={announcement.body} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {new Date(announcement.createdAt).toLocaleString()}
                  </p>
                </>
              )}
            </article>
          );
        })}
        {announcements.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            No announcements for this event yet.
          </p>
        )}
      </div>
    </div>
  );
}
