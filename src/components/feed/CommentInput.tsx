'use client';

import { useState } from 'react';
import { Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>;
  placeholder?: string;
  isSubmitting?: boolean;
  disabled?: boolean;
}

export default function CommentInput({ onSubmit, placeholder = 'Write a comment…', isSubmitting, disabled }: CommentInputProps) {
  const [content, setContent] = useState('');

  async function submit() {
    if (!content.trim() || isSubmitting) return;
    await onSubmit(content.trim());
    setContent('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submit();
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/90 dark:bg-slate-800/30 shadow-sm shadow-slate-200/30 dark:shadow-none transition-colors duration-200 focus-within:border-slate-400 dark:focus-within:border-slate-500/80">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={placeholder}
          disabled={isSubmitting || disabled}
          className="w-full min-h-[2.75rem] pl-3 pr-[7.25rem] py-2.5 bg-transparent text-slate-900 dark:text-slate-100 text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none rounded-xl border-0 focus:outline-none focus:ring-0 transition-colors duration-200 disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
          <Button
            type="submit"
            disabled={!content.trim() || isSubmitting || disabled}
            className="pointer-events-auto themed-btn-primary cursor-pointer inline-flex items-center justify-center relative overflow-hidden rounded-full text-white/95 font-semibold border-0 disabled:opacity-60 h-9 min-w-[6.75rem] px-3.5 group text-sm shrink-0 shadow-md shadow-violet-950/25"
          >
            <span className="relative z-10 inline-flex items-center gap-2">
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Comment</span>
                </>
              )}
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
          </Button>
        </div>
      </div>
    </form>
  );
}
