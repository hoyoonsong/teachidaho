import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import RichTextDisplay from "../richText/RichTextDisplay";
import RichTextEditor from "../richText/RichTextEditor";
import {
  addAnnouncementComment,
  deleteAnnouncementComment,
  listAnnouncementComments,
  type AnnouncementCommentRecord,
  type AnnouncementCommentVisibility,
} from "../../lib/appDataStore";

function htmlToPlainText(html: string): string {
  if (typeof document === "undefined")
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const d = document.createElement("div");
  d.innerHTML = html;
  return d.textContent?.trim() ?? "";
}

type AnnouncementThreadProps = {
  announcementId: string;
  currentUserId: string | null;
  isAdmin: boolean;
};

function roleInParens(role: string | null | undefined): string {
  const r = (role ?? "member").toLowerCase().trim();
  if (r === "admin") return "admin";
  if (r === "teacher") return "teacher";
  if (r === "student") return "student";
  if (r === "volunteer") return "volunteer";
  return "member";
}

function ChatPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect width="14" height="10" x="5" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function CommentCard({
  c,
  depth,
  currentUserId,
  isAdmin,
  onReply,
  onDeleted,
}: {
  c: AnnouncementCommentRecord;
  depth: number;
  currentUserId: string | null;
  isAdmin: boolean;
  onReply: (id: string) => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const canDelete = (currentUserId && c.authorId === currentUserId) || isAdmin;
  const isPrivate = c.visibility === "private";

  async function handleDelete() {
    if (!confirm("Delete this comment?")) return;
    setBusy(true);
    try {
      await deleteAnnouncementComment(c.id);
      onDeleted();
    } finally {
      setBusy(false);
    }
  }

  const displayName = c.authorName || c.authorEmail || "Member";
  const role = roleInParens(c.authorRole);

  return (
    <div
      className={`rounded-lg px-3 py-2 text-sm ${
        isPrivate
          ? "border-2 border-violet-400 bg-violet-50/95 ring-1 ring-violet-200/80"
          : `border border-slate-200 bg-slate-50/80 ${
              depth > 0 ? "ml-4 mt-2 border-l-2 border-l-violet-200" : ""
            }`
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        {isPrivate ? (
          <LockIcon className="h-3.5 w-3.5 shrink-0 text-violet-700" />
        ) : null}
        <span className="font-semibold text-slate-900">
          {displayName}{" "}
          <span className="font-medium text-slate-500">({role})</span>
        </span>
        {isPrivate ? (
          <span className="rounded-md bg-violet-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Private — only you &amp; staff
          </span>
        ) : (
          <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
            Public
          </span>
        )}
        <span className="text-xs text-slate-400">
          {new Date(c.createdAt).toLocaleString()}
        </span>
      </div>
      <div className="mt-1.5 text-sm leading-relaxed text-slate-800 [&_a]:text-blue-600 [&_a]:underline">
        <RichTextDisplay content={c.body} />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {currentUserId ? (
          <button
            type="button"
            onClick={() => onReply(c.id)}
            className="text-xs font-semibold text-emerald-800 underline decoration-emerald-300"
          >
            Reply
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDelete()}
            className="text-xs font-semibold text-rose-700 underline decoration-rose-300 disabled:opacity-50"
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AnnouncementThread({
  announcementId,
  currentUserId,
  isAdmin,
}: AnnouncementThreadProps) {
  const [items, setItems] = useState<AnnouncementCommentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [visibility, setVisibility] =
    useState<AnnouncementCommentVisibility>("public");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);

  const showComposer = Boolean(
    currentUserId && (composerOpen || replyToId !== null),
  );

  const load = useCallback(async () => {
    const rows = await listAnnouncementComments(announcementId);
    setItems(rows);
    setLoading(false);
  }, [announcementId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  function openNewComment() {
    setReplyToId(null);
    setVisibility("public");
    setComposerOpen(true);
  }

  function beginReply(id: string) {
    setReplyToId(id);
    setVisibility("private");
    setComposerOpen(true);
  }

  function switchToTopLevelComment() {
    setReplyToId(null);
    setVisibility("public");
  }

  function closeComposer() {
    setComposerOpen(false);
    setReplyToId(null);
    setBody("");
    setVisibility("public");
  }

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!currentUserId || !htmlToPlainText(body)) return;
    setPosting(true);
    try {
      await addAnnouncementComment({
        announcementId,
        parentId: replyToId,
        body: body.trim(),
        visibility,
      });
      setBody("");
      setReplyToId(null);
      setComposerOpen(false);
      setVisibility("public");
      await load();
    } finally {
      setPosting(false);
    }
  }

  const byParent = new Map<string | null, AnnouncementCommentRecord[]>();
  for (const c of items) {
    const k = c.parentId;
    const list = byParent.get(k) ?? [];
    list.push(c);
    byParent.set(k, list);
  }

  const roots = byParent.get(null) ?? [];

  function renderReplies(parentId: string, depth: number): ReactNode {
    const kids = byParent.get(parentId) ?? [];
    return kids.map((c) => (
      <div key={c.id}>
        <CommentCard
          c={c}
          depth={depth}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onReply={beginReply}
          onDeleted={() => void load()}
        />
        {renderReplies(c.id, depth + 1)}
      </div>
    ));
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-4">
      <h3 className="text-sm font-bold text-slate-800">Comments</h3>

      {loading ? (
        <p className="mt-2 text-xs text-slate-500">Loading comments…</p>
      ) : (
        <div className="mt-3 space-y-2">
          {roots.length === 0 ? (
            <p className="text-xs text-slate-500">No comments yet.</p>
          ) : (
            roots.map((c) => (
              <div key={c.id}>
                <CommentCard
                  c={c}
                  depth={0}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onReply={beginReply}
                  onDeleted={() => void load()}
                />
                {renderReplies(c.id, 1)}
              </div>
            ))
          )}
        </div>
      )}

      {currentUserId ? (
        <div className="mt-4">
          {!showComposer ? (
            <button
              type="button"
              onClick={openNewComment}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
            >
              <ChatPlusIcon className="h-4 w-4 text-emerald-700" />
              Add comment
            </button>
          ) : (
            <form className="space-y-2" onSubmit={handlePost}>
              {replyToId ? (
                <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-950">
                  <p className="font-semibold">Replying in a thread</p>
                  <p className="mt-0.5 text-violet-900/90">
                    Defaults to <strong>private</strong> (only you and staff).
                    The original poster can always read replies to their private
                    comment.
                  </p>
                  <button
                    type="button"
                    className="mt-2 font-semibold text-violet-800 underline"
                    onClick={switchToTopLevelComment}
                  >
                    New top-level comment
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-600">
                  {isAdmin
                    ? "Visible to everyone who can see this announcement unless you choose private."
                    : "Public comments are visible to all readers of this post."}
                </p>
              )}
              <div>
                <span className="sr-only">Comment</span>
                <RichTextEditor
                  value={body}
                  onChange={setBody}
                  rows={4}
                  compact
                  toolbarMode="always"
                  placeholder={
                    replyToId
                      ? "Write a reply…"
                      : isAdmin
                        ? "Add a follow-up or clarification…"
                        : "Ask a question or add a note…"
                  }
                  editorClassName="min-h-[5.5rem] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-slate-600">
                  <span>Visibility</span>
                  <select
                    value={visibility}
                    onChange={(ev) =>
                      setVisibility(
                        ev.target.value as AnnouncementCommentVisibility,
                      )
                    }
                    className="rounded border border-slate-300 px-2 py-1 text-sm"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private (you + staff)</option>
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={posting}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {posting ? "Posting…" : "Post"}
                </button>
                <button
                  type="button"
                  disabled={posting}
                  onClick={closeComposer}
                  className="text-sm font-semibold text-slate-600 underline decoration-slate-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          Sign in to join the discussion.
        </p>
      )}
    </div>
  );
}
