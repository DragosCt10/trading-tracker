'use client';

import React, { useState, useEffect } from 'react';
import { createNote } from '@/lib/server/notes';
import { useUserDetails } from '@/hooks/useUserDetails';
import { useStrategies } from '@/hooks/useStrategies';
import { FileText, Loader2, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// shadcn/ui
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
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
        is_pinned: false,
      });
      setError(null);
      setIsPreview(false);
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
      if (!data) throw new Error('Failed to create note');

      if (onNoteCreated) onNoteCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create note. Please try again.');
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

        {/* Scrollable content wrapper */}
        <div className="relative overflow-y-auto flex-1 px-6 py-5">
          <AlertDialogHeader className="space-y-1.5 mb-4">
            <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-500/20 dark:to-violet-500/20 border border-purple-200/50 dark:border-purple-700/50">
                <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span>New Note</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Create a new note with markdown support
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <Alert variant="destructive" className="mb-4 bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 backdrop-blur-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
                className="h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300"
                placeholder="Note title"
                required
              />
            </div>

            {/* Strategy (optional) */}
            <div className="space-y-1.5">
              <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Strategy (Optional)
              </Label>
              <Select
                value={note.strategy_id || 'none'}
                onValueChange={(value) =>
                  setNote({ ...note, strategy_id: value === 'none' ? null : value })
                }
              >
                <SelectTrigger className="h-12 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-300 dark:border-slate-700 focus:border-purple-500 dark:focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 dark:focus:ring-purple-400/20 transition-all duration-300">
                  <SelectValue placeholder="Select Strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Strategy</SelectItem>
                  {strategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Markdown Editor */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Content *
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPreview(false)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      !isPreview
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreview(true)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      isPreview
                        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>
              <div className="border border-slate-200/70 dark:border-slate-800/70 rounded-xl overflow-hidden bg-white dark:bg-[#0d0a12]">
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
                    className="min-h-[400px] p-4 bg-transparent border-0 outline-none resize-none text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-600 font-mono text-sm"
                    placeholder="Start writing your note in markdown..."
                    required
                  />
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Supports markdown syntax (headers, bold, italic, lists, links, etc.)
              </p>
            </div>

            {/* Pin Note */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pin-note"
                checked={note.is_pinned}
                onCheckedChange={(checked) =>
                  setNote({ ...note, is_pinned: checked as boolean })
                }
                className="h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-purple-400 dark:hover:border-purple-500 data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-purple-500 data-[state=checked]:to-violet-600 data-[state=checked]:border-purple-500 dark:data-[state=checked]:border-purple-400 data-[state=checked]:!text-white transition-colors duration-150"
              />
              <Label htmlFor="pin-note" className="text-sm font-normal cursor-pointer">
                Pin this note
              </Label>
            </div>

            {/* Action Buttons */}
            <AlertDialogFooter className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="cursor-pointer relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-violet-600 to-fuchsia-600 hover:from-purple-600 hover:via-violet-700 hover:to-fuchsia-700 text-white font-semibold shadow-md shadow-purple-500/30 dark:shadow-purple-500/20 px-4 py-2 group border-0 disabled:opacity-60"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting ? 'Creating...' : 'Create Note'}
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
