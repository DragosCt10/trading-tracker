'use client';

import { useEffect, useState } from 'react';
import { Loader2, X, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { useChannelActions } from '@/hooks/useChannels';

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
}

const INPUT_CLASS =
  'h-11 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-sm text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 themed-focus';

export default function CreateChannelModal({ open, onClose, userId }: CreateChannelModalProps) {
  const [name, setName]         = useState('');
  const [slug, setSlug]         = useState('');
  const [description, setDesc]  = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const { create } = useChannelActions(userId);

  useEffect(() => {
    if (!error) return;
    const timeoutId = window.setTimeout(() => {
      setError(null);
    }, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-]/g, '-')) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const result = await create.mutateAsync({
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      isPublic,
    });
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setName(''); setSlug(''); setDesc(''); setIsPublic(true);
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <AlertDialogContent className="max-w-lg max-h-[90vh] fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden">

        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl" />
        </div>

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <AlertDialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg themed-header-icon-box">
                  <Hash className="h-5 w-5" />
                </div>
                <span>Create Channel</span>
              </AlertDialogTitle>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-sm h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <AlertDialogDescription className="sr-only">Create a new channel</AlertDialogDescription>
          </AlertDialogHeader>
        </div>

        {/* Content */}
        <div className="relative overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* Channel name */}
          <div className="space-y-1.5">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Channel name
            </Label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Scalping Setups"
              className={INPUT_CLASS}
              maxLength={60}
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Slug <span className="font-normal text-slate-400 dark:text-slate-500">(URL)</span>
            </Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="scalping-setups"
              className={`${INPUT_CLASS} font-mono text-sm`}
              maxLength={60}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Description <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
            </Label>
            <Input
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What's this channel about?"
              className={INPUT_CLASS}
              maxLength={280}
            />
          </div>

          {/* Public toggle */}
          <div className="flex items-center justify-between py-3 border-t border-slate-200/60 dark:border-slate-700/40">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Public channel</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Anyone can find and join this channel</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                isPublic ? 'themed-btn-primary' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  isPublic ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {error && <p className="text-sm text-rose-500">{error}</p>}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={create.isPending}
              className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || !slug.trim() || create.isPending}
              className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60"
            >
              <span className="relative z-10 flex items-center gap-2 text-sm">
                {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {create.isPending ? 'Creating…' : 'Create Channel'}
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
          </div>
        </div>

      </AlertDialogContent>
    </AlertDialog>
  );
}
