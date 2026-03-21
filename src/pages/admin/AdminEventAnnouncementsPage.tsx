import { useEffect, useState } from "react";
import { AdminModal } from "../../components/admin/AdminModal";
import { AnnouncementThread } from "../../components/announcements/AnnouncementThread";
import RichTextEditor from "../../components/richText/RichTextEditor";
import { PencilIconButton } from "../../components/ui/PencilIconButton";
import RichTextDisplay from "../../components/richText/RichTextDisplay";
import { useAuth } from "../../hooks/useAuth";
import {
  createAnnouncement,
  listAnnouncementsForEvent,
  permanentlyDeleteAnnouncement,
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

export function AdminEventAnnouncementsPage({
  eventId,
}: AdminEventAnnouncementsPageProps) {
  const { userId, role } = useAuth();
  const isAdmin = role === "admin";
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState<AnnouncementFormState>(initialForm);
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<AnnouncementFormState | null>(
    null,
  );
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

  async function handleComposeSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !htmlToPlainText(form.body)) return;
    setPosting(true);
    try {
      await createAnnouncement({
        title: form.title,
        body: form.body,
        audience: form.audience,
        eventId,
      });
      setForm(initialForm);
      setComposeOpen(false);
      await loadData();
    } finally {
      setPosting(false);
    }
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
    if (
      !confirm(
        "Soft-delete this announcement? It will disappear for participants for up to 30 days, then be removed permanently.",
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

  function startEdit(a: AnnouncementRecord) {
    setEditingId(a.id);
    setEditDraft({
      title: a.title,
      body: a.body,
      audience: a.audience,
    });
  }

  return (
    <div className="relative space-y-4 pb-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Announcements
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Posts are scoped to this event.{" "}
          <span className="font-semibold text-slate-800">Public</span> here means
          all roles who are &quot;in&quot; the event: submitted/approved
          teachers, subscribed students/volunteers, and admins—not the whole
          internet. Role-specific audiences are further limited. Deleting is soft
          (Recently deleted); auto-purge after ~30 days, or Delete forever.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setComposeOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-3xl font-light text-white shadow-lg ring-4 ring-white transition hover:bg-slate-800 hover:shadow-xl"
        aria-label="New announcement"
      >
        +
      </button>

      <AdminModal
        open={composeOpen}
        title="New announcement"
        description="Post to this event. The dialog closes after a successful post."
        onClose={() => !posting && setComposeOpen(false)}
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              disabled={posting}
              onClick={() => setComposeOpen(false)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-new-announcement-form"
              disabled={posting}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {posting ? "Posting…" : "Post"}
            </button>
          </div>
        }
      >
        <form
          id="admin-new-announcement-form"
          className="space-y-3"
          onSubmit={handleComposeSubmit}
        >
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Title *
            </span>
            <input
              required
              value={form.title}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
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
              <option value="students">Students</option>
              <option value="admins">Admins</option>
            </select>
          </label>
          <div>
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
        </form>
      </AdminModal>

      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Active
        </h2>
        {announcements
          .filter((a) => !a.deletedAt)
          .map((announcement) => {
          const isEditing = editingId === announcement.id;

          return (
            <article
              key={announcement.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              {isEditing && editDraft ? (
                <div className="space-y-3">
                  <input
                    value={editDraft.title}
                    onChange={(e) =>
                      setEditDraft((d) =>
                        d ? { ...d, title: e.target.value } : d,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
                  />
                  <select
                    value={editDraft.audience}
                    onChange={(e) =>
                      setEditDraft((d) =>
                        d
                          ? {
                              ...d,
                              audience: e.target.value as AnnouncementAudience,
                            }
                          : d,
                      )
                    }
                    className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="public">Public</option>
                    <option value="teachers">Teachers</option>
                    <option value="volunteers">Volunteers</option>
                    <option value="students">Students</option>
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
                      <h3 className="text-lg font-bold text-slate-900">
                        {announcement.title}
                      </h3>
                      <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {announcement.audience}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                    </div>
                  </div>
                  <div className="mt-3 text-sm">
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
                </>
              )}
            </article>
          );
        })}
        {announcements.filter((a) => !a.deletedAt).length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            No active announcements for this event yet. Tap + to add one.
          </p>
        )}
      </div>

      <div className="space-y-3 pt-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
          Recently deleted
        </h2>
        {announcements
          .filter((a) => a.deletedAt)
          .map((announcement) => (
            <article
              key={announcement.id}
              className="rounded-xl border border-amber-300 bg-amber-50/40 p-4 shadow-sm"
            >
              {announcement.deletedAt ? (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-100/80 px-3 py-2 text-xs font-medium text-amber-950">
                  Auto-purge in ~{daysUntilPurge(announcement.deletedAt)}{" "}
                  day(s), or restore / delete forever.
                </p>
              ) : null}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">
                    {announcement.title}
                  </h3>
                  <span className="rounded-full border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {announcement.audience}
                  </span>
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
              <div className="mt-3 text-sm">
                <RichTextDisplay content={announcement.body} />
              </div>
              <AnnouncementThread
                announcementId={announcement.id}
                currentUserId={userId}
                isAdmin={isAdmin}
              />
            </article>
          ))}
        {announcements.filter((a) => a.deletedAt).length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
            No deleted announcements for this event.
          </p>
        ) : null}
      </div>
    </div>
  );
}
