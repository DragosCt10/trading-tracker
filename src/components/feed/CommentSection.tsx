'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import CommentInput from './CommentInput';
import TierBadge from './TierBadge';
import { useComments } from '@/hooks/useComments';
import { useTheme } from '@/hooks/useTheme';
import type { FeedComment, PaginatedResult } from '@/types/social';
import { formatFeedCommentDate } from '@/utils/feedDateFormat';

interface CommentSectionProps {
  postId: string;
  currentProfileId?: string;
  initialComments?: PaginatedResult<FeedComment>;
  onCountChange?: (delta: number) => void;
}

type EditState = 'idle' | 'editing' | 'saving';


function CommentItem({
  comment,
  currentProfileId,
  onEdit,
  onDelete,
}: {
  comment: FeedComment;
  currentProfileId?: string;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [editState, setEditState] = useState<EditState>('idle');
  const [editContent, setEditContent] = useState(comment.content);
  const [editError, setEditError] = useState('');
  const isOwn = currentProfileId === comment.author.id;
  const { theme, mounted } = useTheme();
  const isLightMode = mounted && theme === 'light';
  const authorTier = comment.author.tier;
  const isPro = authorTier === 'pro' || authorTier === 'elite';

  async function handleSave() {
    if (!editContent.trim()) return;
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

  return (
    <div className="rounded-xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/35 shadow-sm shadow-slate-200/40 dark:shadow-none px-4 py-3">
      <div className="flex items-start gap-3 mb-3">
        <Link href={`/profile/${comment.author.username}`} className="shrink-0">
          <div
            className={`w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm ${mounted && isPro ? 'ring-2 ring-amber-400/75 ring-offset-1 ring-offset-white dark:ring-offset-slate-800' : ''}`}
          >
            {comment.author.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={comment.author.avatar_url} alt={comment.author.display_name} className="w-full h-full object-cover" />
            ) : (
              comment.author.display_name.slice(0, 1).toUpperCase()
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/profile/${comment.author.username}`}
              className="font-semibold text-sm text-slate-900 dark:text-slate-200 hover:text-slate-700 dark:hover:text-white transition-colors leading-none"
            >
              {comment.author.display_name}
            </Link>
            {!mounted && isPro && (
              <span className="h-5 w-14 rounded-md bg-slate-200/70 dark:bg-slate-700/50 animate-pulse" />
            )}
            {mounted && isPro && (
              <TierBadge tier={authorTier} isLightMode={isLightMode} />
            )}
          </div>
          <div className="mt-1">
            <span className="text-slate-500 text-xs">@{comment.author.username}</span>
          </div>
        </div>

        <div className="ml-auto pl-2 shrink-0 flex items-center gap-1 self-start">
          <span className="text-slate-500 text-xs shrink-0 whitespace-nowrap" suppressHydrationWarning>
            {formatFeedCommentDate(comment.created_at)}
          </span>
          {isOwn && editState === 'idle' && (
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
                onClick={() => { setEditContent(comment.content); setEditState('editing'); }}
                aria-label="Edit comment"
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
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
        <p suppressHydrationWarning className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
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
    </div>
  );
}

export default function CommentSection({ postId, currentProfileId, initialComments, onCountChange }: CommentSectionProps) {
  const { query, add, edit, remove } = useComments(postId, initialComments);
  const comments = query.data?.pages.flatMap((p) => p.items) ?? [];

  async function handleAdd(content: string) {
    const result = await add.mutateAsync({ content });
    if ('error' in result) return;
    onCountChange?.(1);
  }

  async function handleEdit(commentId: string, content: string) {
    const result = await edit.mutateAsync({ commentId, content });
    if ('error' in result) throw new Error(result.error);
  }

  async function handleDelete(commentId: string) {
    const result = await remove.mutateAsync(commentId);
    if ('error' in result) return;
    onCountChange?.(-1);
  }

  return (
    <div className="space-y-3">
      {currentProfileId && (
        <CommentInput onSubmit={handleAdd} isSubmitting={add.isPending} />
      )}

      {comments.length === 0 && !query.isLoading ? (
        <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6 text-center">
          <p className="text-slate-500 text-sm">Be the first to comment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentProfileId={currentProfileId}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
