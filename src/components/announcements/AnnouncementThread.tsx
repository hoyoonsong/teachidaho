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

function IconChevronRight({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
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
  onReply: (parent: AnnouncementCommentRecord) => void;
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
  const isReply = depth > 0;

  return (
    <div
      className={`rounded-lg text-xs transition-shadow ${
        isReply
          ? "relative ml-5 mt-2 border border-slate-200/90 border-l-[3px] border-l-emerald-500/80 bg-slate-50/90 pl-3 pr-2.5 py-2 shadow-[inset_2px_0_0_rgba(16,185,129,0.12)]"
          : "border border-slate-200 bg-white px-2.5 py-1.5"
      }`}
    >
      {isReply ? (
        <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800/90">
          <span className="text-emerald-600" aria-hidden>
            ↳
          </span>
          Reply
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-semibold text-slate-800">
          {displayName}{" "}
          <span className="font-normal text-slate-500">({role})</span>
        </span>
        {isPrivate ? (
          <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-violet-700">
            private
          </span>
        ) : (
          <span className="shrink-0 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
            public
          </span>
        )}
        <span className="text-[11px] text-slate-400">
          {new Date(c.createdAt).toLocaleString()}
        </span>
      </div>
      <div className="mt-1 text-xs leading-relaxed text-slate-700 [&_a]:text-blue-600 [&_a]:underline">
        <RichTextDisplay content={c.body} />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {currentUserId ? (
          <button
            type="button"
            onClick={() => onReply(c)}
            className="text-[11px] font-semibold text-emerald-800 underline decoration-emerald-200"
          >
            Reply
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDelete()}
            className="text-[11px] font-semibold text-rose-700 underline decoration-rose-200 disabled:opacity-50"
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
  /** Visibility of the comment being replied to (for hint text only). */
  const [repliedToVisibility, setRepliedToVisibility] =
    useState<AnnouncementCommentVisibility | null>(null);
  const [posting, setPosting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);

  const showComposer = Boolean(
    currentUserId && (composerOpen || replyToId !== null),
  );

  const commentCount = items.length;

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
    setRepliedToVisibility(null);
    setVisibility("public");
    setComposerOpen(true);
    setThreadOpen(true);
  }

  function beginReply(parent: AnnouncementCommentRecord) {
    const v: AnnouncementCommentVisibility =
      parent.visibility === "private" ? "private" : "public";
    setReplyToId(parent.id);
    setRepliedToVisibility(v);
    setVisibility(v);
    setComposerOpen(true);
    setThreadOpen(true);
  }

  function switchToTopLevelComment() {
    setReplyToId(null);
    setRepliedToVisibility(null);
    setVisibility("public");
  }

  function closeComposer() {
    setComposerOpen(false);
    setReplyToId(null);
    setRepliedToVisibility(null);
    setBody("");
    setVisibility("public");
  }

  async function handlePost(e: FormEvent) {
    e.preventDefault();
    if (!currentUserId || !htmlToPlainText(body)) return;
    setPosting(true);
    try {
      const created = await addAnnouncementComment({
        announcementId,
        parentId: replyToId,
        body: body.trim(),
        visibility,
        authorId: currentUserId,
      });
      setBody("");
      setReplyToId(null);
      setRepliedToVisibility(null);
      setComposerOpen(false);
      setVisibility("public");
      setThreadOpen(true);
      setItems((prev) => {
        if (prev.some((x) => x.id === created.id)) return prev;
        return [...prev, created].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );
      });
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
    if (kids.length === 0) return null;
    const blocks = kids.map((c) => (
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
    if (depth === 1) {
      return (
        <div className="mt-1 space-y-0 border-l-2 border-emerald-200/70 pl-3">
          {blocks}
        </div>
      );
    }
    return blocks;
  }

  const panelId = `announcement-thread-${announcementId}`;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        type="button"
        id={`${panelId}-toggle`}
        aria-expanded={threadOpen}
        aria-controls={panelId}
        onClick={() => setThreadOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        <span>
          Comments
          <span className="ml-1.5 font-normal text-slate-500">
            ({commentCount})
          </span>
        </span>
        <span className="shrink-0 text-slate-500" aria-hidden>
          {threadOpen ? (
            <IconChevronDown className="h-4 w-4" />
          ) : (
            <IconChevronRight className="h-4 w-4" />
          )}
        </span>
      </button>

      {threadOpen ? (
        <div id={panelId} className="mt-2 space-y-2" role="region">
          {loading ? (
            <p className="text-xs text-slate-500">Loading comments…</p>
          ) : roots.length === 0 ? (
            <p className="text-xs text-slate-500">No comments yet.</p>
          ) : (
            <div className="space-y-1.5">
              {roots.map((c) => (
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
              ))}
            </div>
          )}

          {currentUserId ? (
            <div className="pt-1">
              {!showComposer ? (
                <button
                  type="button"
                  onClick={openNewComment}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ChatPlusIcon className="h-3.5 w-3.5 text-emerald-700" />
                  Add comment
                </button>
              ) : (
                <form className="space-y-2" onSubmit={handlePost}>
                  {replyToId ? (
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs text-slate-700">
                      <p className="font-semibold text-slate-800">
                        Replying in a thread
                      </p>
                      <p className="mt-0.5 text-slate-600">
                        You&apos;re replying to a{" "}
                        {repliedToVisibility === "private" ? (
                          <span className="font-semibold text-violet-700">
                            private
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-800">
                            public
                          </span>
                        )}{" "}
                        comment; your reply defaults the same way. Change below if
                        needed.
                      </p>
                      <button
                        type="button"
                        className="mt-1.5 font-semibold text-slate-800 underline"
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
                      rows={3}
                      compact
                      toolbarMode="always"
                      placeholder={
                        replyToId
                          ? "Write a reply…"
                          : isAdmin
                            ? "Add a follow-up or clarification…"
                            : "Ask a question or add a note…"
                      }
                      editorClassName="min-h-[4rem] rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span>Visibility</span>
                      <select
                        value={visibility}
                        onChange={(ev) =>
                          setVisibility(
                            ev.target.value as AnnouncementCommentVisibility,
                          )
                        }
                        className="rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </label>
                    <button
                      type="submit"
                      disabled={posting}
                      className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {posting ? "Posting…" : "Post"}
                    </button>
                    <button
                      type="button"
                      disabled={posting}
                      onClick={closeComposer}
                      className="text-xs font-semibold text-slate-600 underline decoration-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">Sign in to join the discussion.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
