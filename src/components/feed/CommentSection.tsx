'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import CommentInput from './CommentInput';
import { useComments } from '@/hooks/useComments';
import type { FeedComment, PaginatedResult } from '@/types/social';

interface CommentSectionProps {
  postId: string;
  currentProfileId?: string;
  initialComments?: PaginatedResult<FeedComment>;
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
    <div className="rounded-xl border border-slate-700/55 bg-slate-800/35 px-4 py-3 group">
      <div className="flex items-center gap-2 mb-1.5">
        <Link
          href={`/profile/${comment.author.username}`}
          className="font-semibold text-sm text-slate-200 hover:text-white transition-colors"
        >
          {comment.author.display_name}
        </Link>
        <span className="text-slate-600 text-xs">@{comment.author.username}</span>
        <span className="text-slate-600 text-xs">·</span>
        <span className="text-slate-600 text-xs">
          {new Date(comment.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>

        {/* Author actions — shown on hover */}
        {isOwn && editState === 'idle' && (
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
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

      {editState === 'idle' ? (
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
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
            className="w-full px-3 py-2 rounded-lg border border-slate-700/60 bg-slate-800/60 text-slate-100 text-sm resize-none focus:outline-none focus:border-slate-500/80 transition-colors duration-200"
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
              className="p-1.5 rounded-lg bg-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-600/60 disabled:opacity-50 transition-colors"
              aria-label="Save edit"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => { setEditState('idle'); setEditContent(comment.content); }}
              className="p-1.5 rounded-lg bg-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-600/60 transition-colors"
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

export default function CommentSection({ postId, currentProfileId, initialComments }: CommentSectionProps) {
  const { query, add, edit, remove } = useComments(postId, initialComments);
  const comments = query.data?.pages.flatMap((p) => p.items) ?? [];

  async function handleAdd(content: string) {
    await add.mutateAsync({ content });
  }

  async function handleEdit(commentId: string, content: string) {
    const result = await edit.mutateAsync({ commentId, content });
    if ('error' in result) throw new Error(result.error);
  }

  return (
    <div className="space-y-3">
      {currentProfileId && (
        <CommentInput onSubmit={handleAdd} isSubmitting={add.isPending} />
      )}

      {comments.length === 0 && !query.isLoading ? (
        <div className="rounded-2xl border border-slate-700/55 bg-slate-800/35 backdrop-blur-xl p-6 text-center">
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
              onDelete={(id) => remove.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
