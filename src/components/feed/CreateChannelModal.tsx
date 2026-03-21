'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChannelActions } from '@/hooks/useChannels';

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
}

export default function CreateChannelModal({ open, onClose, userId }: CreateChannelModalProps) {
  const [name, setName]         = useState('');
  const [slug, setSlug]         = useState('');
  const [description, setDesc]  = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const { create } = useChannelActions(userId);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9-]/g, '-')) {
      setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const result = await create.mutateAsync({ name: name.trim(), slug: slug.trim(), description: description.trim() || undefined, isPublic });
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setName(''); setSlug(''); setDesc(''); setIsPublic(true);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-2xl border border-slate-700/60 bg-slate-900/95 backdrop-blur-xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Create Channel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Channel name</label>
            <Input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Scalping Setups"
              className="bg-slate-800/60 border-slate-700/60 text-slate-100 placeholder:text-slate-500"
              maxLength={60}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Slug (URL)</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="scalping-setups"
              className="bg-slate-800/60 border-slate-700/60 text-slate-100 placeholder:text-slate-500 font-mono text-sm"
              maxLength={60}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Description <span className="text-slate-600">(optional)</span></label>
            <Input
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="What's this channel about?"
              className="bg-slate-800/60 border-slate-700/60 text-slate-100 placeholder:text-slate-500"
              maxLength={280}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPublic ? 'bg-emerald-600' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isPublic ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-slate-300">{isPublic ? 'Public channel' : 'Private channel'}</span>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" className="flex-1 text-slate-400" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              disabled={!name.trim() || !slug.trim() || create.isPending}
              onClick={handleSubmit}
            >
              {create.isPending ? 'Creating…' : 'Create Channel'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
