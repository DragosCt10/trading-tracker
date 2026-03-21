'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  isSubmitting?: boolean;
}

export default function CommentInput({ onSubmit, placeholder = 'Write a comment…', isSubmitting }: CommentInputProps) {
  const [content, setContent] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;
    await onSubmit(content.trim());
    setContent('');
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder={placeholder}
        disabled={isSubmitting}
        className="flex-1 px-3 py-2 rounded-xl border border-slate-700/60 bg-slate-800/50 text-slate-100 text-sm placeholder:text-slate-500 resize-none focus:outline-none focus:border-slate-500/80 transition-colors duration-200 disabled:opacity-50"
      />
      <Button
        type="submit"
        disabled={!content.trim() || isSubmitting}
        className="self-end themed-btn-primary relative overflow-hidden rounded-xl text-white font-semibold border-0 disabled:opacity-50 h-9 px-3 group text-sm"
      >
        {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Post'}
      </Button>
    </form>
  );
}
