'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Check, X, CornerDownRight } from 'lucide-react';
import CommentInput from './CommentInput';
import TierBadge from './TierBadge';
import { useComments, useReplies } from '@/hooks/useComments';
import { useTheme } from '@/hooks/useTheme';
import type { FeedComment, PaginatedResult } from '@/types/social';
import { formatFeedCommentDate } from '@/utils/feedDateFormat';
import { getPublicDisplayName } from '@/utils/displayName';

interface CommentSectionProps {
  postId: string;
  currentProfileId?: string;
  initialComments?: PaginatedResult<FeedComment>;
  onCountChange?: (delta: number) => void;
  onAuthorClick?: (username: string) => void;
}

type EditState = 'idle' | 'editing' | 'saving';
const COMMENT_EDIT_WINDOW_MS = 10 * 60 * 1000;

// ─── Inline reply input ───────────────────────────────────────────────────────

function ReplyInput({
  placeholder,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  placeholder: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) return;
    await onSubmit(trimmed);
    setValue('');
  }

  return (
    <div className="space-y-1.5">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={500}
        rows={2}
        disabled={isSubmitting}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm resize-none focus:outline-none focus:border-slate-400 dark:focus:border-slate-500/80 transition-colors duration-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
        }}
      />
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !value.trim()}
          className="px-3 py-1 rounded-lg bg-slate-200/90 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/80 dark:hover:bg-slate-600/60 disabled:opacity-50 text-xs font-medium transition-colors"
        >
          {isSubmitting ? 'Replying…' : 'Reply'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Reply thread loading placeholder ─────────────────────────────────────────

function ReplySkeleton() {
  return (
    <div
      className="rounded-xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/35 shadow-sm shadow-slate-200/40 dark:shadow-none px-3 py-2.5 animate-pulse"
      aria-hidden
    >
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-slate-200/90 dark:bg-slate-700/80 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2 pt-0.5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-28 rounded-md bg-slate-200/90 dark:bg-slate-700/75" />
            <div className="h-3 w-12 rounded-md bg-slate-200/70 dark:bg-slate-700/60" />
          </div>
          <div className="h-3 w-full max-w-[95%] rounded-md bg-slate-200/70 dark:bg-slate-700/65" />
          <div className="h-3 w-4/5 max-w-[14rem] rounded-md bg-slate-200/60 dark:bg-slate-700/55" />
        </div>
      </div>
    </div>
  );
}

// ─── Single comment item ──────────────────────────────────────────────────────

function CommentItem({
  comment,
  currentProfileId,
  onEdit,
  onDelete,
  onAuthorClick,
  onReplyClick,
  variant = 'thread',
}: {
  comment: FeedComment;
  currentProfileId?: string;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
  onAuthorClick?: (username: string) => void;
  onReplyClick?: () => void;
  variant?: 'thread' | 'reply';
}) {
  const [editState, setEditState] = useState<EditState>('idle');
  const [editContent, setEditContent] = useState(comment.content);
  const [editError, setEditError] = useState('');
  const [nowTs, setNowTs] = useState<number | null>(null);
  const isOwn = currentProfileId === comment.author.id;
  const { theme, mounted } = useTheme();
  const isLightMode = mounted && theme === 'light';
  const authorTier = comment.author.tier;
  const isPro = authorTier === 'pro' || authorTier === 'elite';
  const displayedName = getPublicDisplayName(comment.author);
  const isEdited = new Date(comment.updated_at).getTime() > new Date(comment.created_at).getTime();
  const createdAtTs = new Date(comment.created_at).getTime();
  const canEdit = nowTs !== null && nowTs - createdAtTs <= COMMENT_EDIT_WINDOW_MS;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setNowTs(Date.now()), 0);
    const intervalId = window.setInterval(() => setNowTs(Date.now()), 30_000);
    return () => { window.clearTimeout(timeoutId); window.clearInterval(intervalId); };
  }, []);

  function handleAuthorClick(e: React.MouseEvent) {
    if (!onAuthorClick) return;
    e.preventDefault();
    onAuthorClick(comment.author.username);
  }

  async function handleSave() {
    if (!editContent.trim()) return;
    if (nowTs !== null && nowTs - createdAtTs > COMMENT_EDIT_WINDOW_MS) {
      setEditError('Comments can only be edited within 10 minutes.');
      setEditState('idle');
      return;
    }
    setEditState('saving');
    setEditError('');
    try {
      await onEdit(comment.id, editContent.trim());
      setEditState('idle');
    } catch {
      setEditError('Failed to save');
      setEditState('editing');
    }
  }

  const isReply = variant === 'reply';
  const avatarSize = isReply ? 'w-7 h-7' : 'w-9 h-9';
  const shellClass =
    'rounded-xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/35 shadow-sm shadow-slate-200/40 dark:shadow-none ' +
    (isReply ? 'px-3 py-2.5' : 'px-4 py-3');

  return (
    <div className={shellClass}>
      <div className="flex items-start gap-3 mb-3">
        <Link href={`/profile/${comment.author.username}`} onClick={handleAuthorClick} className="shrink-0">
          <div
            className={`${avatarSize} rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm ${mounted && isPro ? 'ring-2 ring-[#b45309]/45 dark:ring-[rgba(251,191,36,0.45)] ring-offset-1 ring-offset-white dark:ring-offset-slate-800' : ''}`}
          >
            {comment.author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={comment.author.avatar_url} alt={displayedName} className="w-full h-full object-cover" />
            ) : (
              String(displayedName ?? '?').slice(0, 1).toUpperCase()
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/profile/${comment.author.username}`}
              onClick={handleAuthorClick}
              className="font-semibold text-sm text-slate-900 dark:text-slate-200 hover:text-slate-700 dark:hover:text-white transition-colors leading-none"
            >
              {displayedName}
            </Link>
            {!mounted && isPro && (
              <span className="h-5 w-14 rounded-md bg-slate-200/70 dark:bg-slate-700/50 animate-pulse" />
            )}
            {mounted && isPro && (
              <TierBadge tier={authorTier} isLightMode={isLightMode} />
            )}
          </div>
          <div className="mt-1">
            <span className="text-slate-500 text-xs">@{comment.author.is_public ? comment.author.username : displayedName.toLowerCase()}</span>
          </div>
        </div>

        <div className="ml-auto pl-2 shrink-0 flex items-center gap-1 self-start">
          {isEdited && (
            <span className="text-slate-500 text-xs shrink-0 whitespace-nowrap">
              Edited &middot;
            </span>
          )}
          <span className="text-slate-500 text-xs shrink-0 whitespace-nowrap" suppressHydrationWarning>
            {formatFeedCommentDate(comment.created_at)}
          </span>
          {isOwn && editState === 'idle' && (
            <div className="flex items-center gap-0.5">
              {canEdit && (
                <button
                  type="button"
                  className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  onClick={() => { setEditError(''); setEditContent(comment.content); setEditState('editing'); }}
                  aria-label="Edit comment"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                onClick={() => onDelete(comment.id)}
                aria-label="Delete comment"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      {editState === 'idle' ? (
        <p suppressHydrationWarning className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
          {comment.content}
        </p>
      ) : (
        <div className="space-y-1.5">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            maxLength={500}
            rows={2}
            disabled={editState === 'saving'}
            className="w-full px-3 py-2 rounded-lg border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm resize-none focus:outline-none focus:border-slate-400 dark:focus:border-slate-500/80 transition-colors duration-200"
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setEditState('idle'); setEditContent(comment.content); }
            }}
          />
          {editError && <p className="text-xs text-rose-400">{editError}</p>}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSave}
              disabled={editState === 'saving' || !editContent.trim()}
              className="p-1.5 rounded-lg bg-slate-200/90 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/80 dark:hover:bg-slate-600/60 disabled:opacity-50 transition-colors"
              aria-label="Save edit"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setEditState('idle'); setEditContent(comment.content); }}
              className="p-1.5 rounded-lg bg-slate-200/90 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-300/80 dark:hover:bg-slate-600/60 transition-colors"
              aria-label="Cancel edit"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Reply button — only for top-level comments */}
      {!isReply && onReplyClick && editState === 'idle' && (
        <div className="mt-2">
          <button
            type="button"
            onClick={onReplyClick}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors cursor-pointer rounded-lg px-1.5 py-0.5 -ml-1.5 hover:bg-slate-100/80 dark:hover:bg-slate-800/50"
          >
            <CornerDownRight className="w-3 h-3 shrink-0" />
            Reply
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Comment + its replies ────────────────────────────────────────────────────

function CommentWithReplies({
  comment,
  currentProfileId,
  onEdit,
  onDelete,
  onReply,
  onAuthorClick,
}: {
  comment: FeedComment;
  currentProfileId?: string;
  onEdit: (id: string, content: string, parentId?: string) => Promise<void>;
  onDelete: (id: string, parentId?: string) => void;
  onReply: (parentId: string, content: string) => Promise<boolean>;
  onAuthorClick?: (username: string) => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replying, setReplying] = useState(false);
  // Always load replies for this thread (also supports optional nested `comment.replies` from the server)
  const repliesQuery = useReplies(comment.id, true);
  const replies = repliesQuery.data ?? comment.replies ?? [];
  const showReplyThread = replyOpen || replies.length > 0;

  async function handleReplySubmit(content: string) {
    setReplying(true);
    try {
      const ok = await onReply(comment.id, content);
      if (ok) setReplyOpen(false);
    } finally {
      setReplying(false);
    }
  }

  return (
    <div className="space-y-2">
      <CommentItem
        comment={comment}
        variant="thread"
        currentProfileId={currentProfileId}
        onEdit={(id, content) => onEdit(id, content)}
        onDelete={(id) => onDelete(id)}
        onAuthorClick={onAuthorClick}
        onReplyClick={() => setReplyOpen((o) => !o)}
      />

      {showReplyThread && (
        <div className="ml-4 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-slate-200/70 dark:border-slate-700/55 space-y-2">
          {replyOpen && (
            <div className="pt-0.5 space-y-1.5">
              {repliesQuery.isFetching && replies.length === 0 && <ReplySkeleton />}
              <ReplyInput
                placeholder={`Reply to @${comment.author.username}…`}
                onSubmit={handleReplySubmit}
                onCancel={() => setReplyOpen(false)}
                isSubmitting={replying}
              />
            </div>
          )}

          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              variant="reply"
              currentProfileId={currentProfileId}
              onEdit={(id, content) => onEdit(id, content, comment.id)}
              onDelete={(id) => onDelete(id, comment.id)}
              onAuthorClick={onAuthorClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Comment section ──────────────────────────────────────────────────────────

export default function CommentSection({ postId, currentProfileId, initialComments, onCountChange, onAuthorClick }: CommentSectionProps) {
  const { query, add, edit, remove } = useComments(postId, initialComments);
  const comments = query.data?.pages.flatMap((p) => p.items) ?? [];

  async function handleAdd(content: string) {
    const result = await add.mutateAsync({ content });
    if ('error' in result) return;
    onCountChange?.(1);
  }

  async function handleEdit(commentId: string, content: string, parentId?: string) {
    const result = await edit.mutateAsync({ commentId, content, parentId });
    if ('error' in result) throw new Error(result.error);
  }

  function handleDelete(commentId: string, parentId?: string) {
    remove.mutateAsync({ commentId, parentId }).then((result) => {
      if ('error' in result) return;
      if (!parentId) onCountChange?.(-1);
    });
  }

  async function handleReply(parentId: string, content: string): Promise<boolean> {
    const result = await add.mutateAsync({ content, parentId });
    return !('error' in result);
  }

  return (
    <div className="space-y-3">
      {currentProfileId && (
        <CommentInput onSubmit={handleAdd} isSubmitting={add.isPending} />
      )}

      {comments.length === 0 && !query.isLoading ? (
        <div className="rounded-xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/35 shadow-sm shadow-slate-200/40 dark:shadow-none px-4 py-6 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Be the first to comment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentWithReplies
              key={comment.id}
              comment={comment}
              currentProfileId={currentProfileId}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReply={handleReply}
              onAuthorClick={onAuthorClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
