'use client';

import { useState } from 'react';
import { Copy, Check, Loader2, Trash2, Link2, X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useChannelInvites, useChannelInviteActions } from '@/hooks/useChannels';
import type { FeedChannel, ChannelInvite } from '@/types/social';

interface ChannelInviteModalProps {
  channel: FeedChannel;
  userId?: string;
  open: boolean;
  onClose: () => void;
}

const INPUT_CLASS =
  'h-11 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-sm text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 themed-focus';

const MAX_USES_OPTIONS = [
  { label: '5 uses', value: '5' },
  { label: '10 uses', value: '10' },
  { label: '25 uses', value: '25' },
  { label: '50 uses', value: '50' },
  { label: '100 uses', value: '100' },
  { label: 'No limit', value: 'unlimited' },
];

const EXPIRY_OPTIONS = [
  { label: '1 day', value: '1d' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: 'Never', value: 'never' },
];

function expiryLabel(expiresAt: string | null): string {
  if (!expiresAt) return 'Never expires';
  const d = new Date(expiresAt);
  return `Expires ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function usesLabel(invite: ChannelInvite): string {
  if (invite.max_uses === null) return `${invite.use_count} / ∞ uses`;
  return `${invite.use_count} / ${invite.max_uses} uses`;
}

function expiryToDate(value: string): string | undefined {
  if (!value || value === 'never') return undefined;
  const days = parseInt(value, 10);
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export default function ChannelInviteModal({ channel, userId, open, onClose }: ChannelInviteModalProps) {
  const { data: invites = [], isLoading } = useChannelInvites(channel.id, userId);
  const { create, revoke } = useChannelInviteActions(channel.id, userId);

  const [label, setLabel]     = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [expiry, setExpiry]   = useState('');
  const [error, setError]     = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    const result = await create.mutateAsync({
      label:     label.trim() || undefined,
      maxUses:   (maxUses && maxUses !== 'unlimited') ? parseInt(maxUses, 10) : undefined,
      expiresAt: expiryToDate(expiry),
    });
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setLabel(''); setMaxUses(''); setExpiry('');
  };

  const handleCopy = async (invite: ChannelInvite) => {
    const url = `${window.location.origin}/feed/channel/join/${invite.token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (inviteId: string) => {
    await revoke.mutateAsync(inviteId);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden">

        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl" />
        </div>

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                <div className="p-2 rounded-lg themed-header-icon-box">
                  <UserPlus className="h-5 w-5" />
                </div>
                <span>
                  <span className="text-slate-500 dark:text-slate-400 font-mono text-base">#</span>
                  {channel.name} — Invite People
                </span>
              </DialogTitle>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-sm h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white transition-all"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
            <DialogDescription className="sr-only">Manage invite links for {channel.name}</DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="relative overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Active invites */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Active Invites
            </p>

            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            )}

            {!isLoading && invites.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-2">
                No active invite links yet.
              </p>
            )}

            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white/40 dark:bg-slate-800/30"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {invite.label ?? 'Invite link'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono truncate">
                    /feed/channel/join/{invite.token}
                  </p>
                  <div className="flex gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                    <span>{usesLabel(invite)}</span>
                    <span>·</span>
                    <span>{expiryLabel(invite.expires_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleCopy(invite)}
                    title="Copy link"
                    className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    {copiedId === invite.id
                      ? <Check className="h-4 w-4 text-emerald-500" />
                      : <Copy className="h-4 w-4" />
                    }
                  </button>
                  <button
                    onClick={() => handleRevoke(invite.id)}
                    disabled={revoke.isPending}
                    title="Revoke"
                    className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200/60 dark:border-slate-700/40" />

          {/* Create new invite */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Create New Invite
            </p>

            {/* Label */}
            <div className="space-y-1.5">
              <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Label <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
              </Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Twitter promo, Discord share"
                className={INPUT_CLASS}
                maxLength={60}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Max uses */}
              <div className="space-y-1.5">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Max uses
                </Label>
                <Select value={maxUses} onValueChange={setMaxUses}>
                  <SelectTrigger className={INPUT_CLASS}>
                    <SelectValue placeholder="No limit" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAX_USES_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Expiry */}
              <div className="space-y-1.5">
                <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Expires
                </Label>
                <Select value={expiry} onValueChange={setExpiry}>
                  <SelectTrigger className={INPUT_CLASS}>
                    <SelectValue placeholder="Never" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}

            <div className="flex justify-end pt-1">
              <Button
                onClick={handleCreate}
                disabled={create.isPending}
                className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60"
              >
                <span className="relative z-10 flex items-center gap-2 text-sm">
                  {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {create.isPending ? 'Generating…' : 'Generate Link'}
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
