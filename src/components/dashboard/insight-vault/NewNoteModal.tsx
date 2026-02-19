'use client';

import React, { useState, useEffect } from 'react';
import { createNote } from '@/lib/server/notes';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useStrategies } from '@/hooks/useStrategies';
import { FileText, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// shadcn/ui
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNoteCreated?: () => void;
}

export default function NewNoteModal({ isOpen, onClose, onNoteCreated }: NewNoteModalProps) {
  const { data: userDetails } = useUserDetails();
  const userId = userDetails?.user?.id;
  const { strategies } = useStrategies({ userId });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const [note, setNote] = useState({
    title: '',
    content: '',
    strategy_id: null as string | null,
    strategy_ids: [] as string[],
    is_pinned: false,
  });

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setNote({
        title: '',
        content: '',
        strategy_id: null,
        strategy_ids: [],
        is_pinned: false,
      });
      setError(null);
      setIsPreview(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!note.title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!note.content.trim()) {
      setError('Please enter some content');
      return;
    }

    if (!userId) {
      setError('User not found. Please refresh and try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: createError } = await createNote(userId, note);

      if (createError) throw new Error(createError.message);
      if (!data) throw new Error('Failed to create insight');

      setIsSubmitting(false);
      if (onNoteCreated) onNoteCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create insight. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (!mounted || !isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-4xl max-h-[90vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-br from-white via-purple-100/80 to-violet-100/70 dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 rounded-2xl p-0 flex flex-col overflow-hidden">
        {/* Gradient orbs background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div
            className="absolute -top-40 -left-32 w-[420px] h-[420px] bg-purple-500/8 dark:bg-purple-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '8s' }}
          />
          <div
            className="absolute -bottom-40 -right-32 w-[420px] h-[420px] bg-violet-500/8 dark:bg-violet-500/10 rounded-full blur-3xl animate-pulse"
            style={{ animationDuration: '10s', animationDelay: '2s' }}
          />
        </div>

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-60" />

        {/* Fixed Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-500/20 dark:to-violet-500/20 border border-purple-200/50 dark:border-purple-700/50">
                  <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span>New Insight</span>
              </AlertDialogTitle>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Create a new insight with markdown support
            </AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Scrollable content wrapper */}
        <div className="relative overflow-y-auto flex-1 px-6 py-5">

          {error && (
            <div className="rounded-lg bg-red-500/10 backdrop-blur-sm p-3 border border-red-500/20 mb-4">
              <p className="text-xs text-red-500 dark:text-red-300 font-medium">
                {error}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="note-title" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Title *
              </Label>
              <Input
                id="note-title"
                type="text"
                value={note.title}
                onChange={(e) => setNote({ ...note, title: e.target.value })}
                className="h-12 rounded-full bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border-slate-200/60 dark:border-slate-600 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300 shadow-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none"
                placeholder="Insight title"
                required
              />
            </div>

            {/* Strategies (optional - multiple selection) */}
            <div className="space-y-1.5">
              <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Strategies (Optional)
              </Label>
              <div className="border border-slate-200/60 dark:border-slate-600 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:dark:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                {strategies.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No strategies available</p>
                ) : (
                  <div className="space-y-2 pr-1">
                    {strategies.map((strategy) => (
                      <div key={strategy.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`strategy-${strategy.id}`}
                          checked={note.strategy_ids.includes(strategy.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNote({
                                ...note,
                                strategy_ids: [...note.strategy_ids, strategy.id],
                                strategy_id: note.strategy_ids.length === 0 ? strategy.id : note.strategy_id, // Keep backward compat
                              });
                            } else {
                              setNote({
                                ...note,
                                strategy_ids: note.strategy_ids.filter((id) => id !== strategy.id),
                                strategy_id: note.strategy_ids.length === 1 && note.strategy_ids[0] === strategy.id ? null : note.strategy_id,
                              });
                            }
                          }}
                          className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-purple-400 dark:hover:border-purple-500 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-600 data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-400 data-[state=checked]:!text-white transition-colors duration-150"
                        />
                        <Label
                          htmlFor={`strategy-${strategy.id}`}
                          className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300"
                        >
                          {strategy.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {note.strategy_ids.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {note.strategy_ids.length} strateg{note.strategy_ids.length === 1 ? 'y' : 'ies'} selected
                </p>
              )}
            </div>

            {/* Markdown Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Content *
                </Label>
                {/* Switch Toggle */}
                <div className="relative inline-flex items-center bg-slate-100/60 dark:bg-slate-800/40 rounded-xl p-1 border border-slate-200/80 dark:border-slate-700/80">
                  <button
                    type="button"
                    onClick={() => setIsPreview(false)}
                    className={`relative px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                      !isPreview
                        ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreview(true)}
                    className={`relative px-4 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                      isPreview
                        ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>
              <div className="border border-slate-200/60 dark:border-slate-600 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm">
                {isPreview ? (
                  <div className="min-h-[400px] p-4 prose prose-slate dark:prose-invert max-w-none [&_a]:underline [&_a]:text-purple-600 dark:[&_a]:text-purple-400 [&_a]:decoration-purple-500/50 hover:[&_a]:decoration-purple-500">
                    {note.content ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, ...props }) => (
                            <a {...props} className="underline text-purple-600 dark:text-purple-400 decoration-purple-500/50 hover:decoration-purple-500" />
                          ),
                        }}
                      >
                        {note.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600">No content yet...</span>
                    )}
                  </div>
                ) : (
                  <Textarea
                    value={note.content}
                    onChange={(e) => setNote({ ...note, content: e.target.value })}
                    className="min-h-[400px] bg-transparent border-0 outline-none resize-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono text-sm p-4"
                    placeholder="Start writing your insight in markdown..."
                    required
                  />
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports markdown syntax (headers, bold, italic, lists, links, etc.)
              </p>
            </div>

            {/* Pin Insight */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pin-note"
                checked={note.is_pinned}
                onCheckedChange={(checked) =>
                  setNote({ ...note, is_pinned: checked as boolean })
                }
                className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-purple-400 dark:hover:border-purple-500 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-600 data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-400 data-[state=checked]:!text-white transition-colors duration-150"
              />
              <Label htmlFor="pin-note" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300">
                Pin this insight
              </Label>
            </div>

            {/* Action Buttons */}
            <AlertDialogFooter className="mt-4 flex items-center justify-between pt-4">
              <AlertDialogCancel
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
              >
                Cancel
              </AlertDialogCancel>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group border-0 disabled:opacity-60"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                  {isSubmitting && (
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="opacity-25"
                      />
                      <path
                        className="opacity-90"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4A4 4 0 004 12z"
                      />
                    </svg>
                  )}
                  Create Insight
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </Button>
            </AlertDialogFooter>
          </form>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
