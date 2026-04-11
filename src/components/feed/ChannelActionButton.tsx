'use client';

import { Loader2, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChannelActionButtonProps {
  channelId: string;
  isMember: boolean;
  isRemoved: boolean;
  isPending: boolean;
  onJoin: () => void;
  onLeave: () => void;
}

/**
 * The join / leave / removed action button for a channel row.
 * Used in both the Discover list and the My Channels list (non-owner).
 */
export default function ChannelActionButton({
  channelId: _channelId,
  isMember,
  isRemoved,
  isPending,
  onJoin,
  onLeave,
}: ChannelActionButtonProps) {
  if (isRemoved) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled
              className="shrink-0 h-8 rounded-xl text-xs border-rose-200 dark:border-rose-800/60 text-rose-400 dark:text-rose-500 bg-rose-50/50 dark:bg-rose-950/20 cursor-not-allowed opacity-70"
            >
              <Ban className="w-3 h-3 mr-1" />
              Removed by owner
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">You were removed by the owner</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isMember) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="shrink-0 cursor-pointer h-8 rounded-xl text-xs border-slate-300/90 bg-slate-50/70 text-slate-600 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/70 dark:border-slate-600/70 dark:bg-slate-800/40 dark:text-rose-300 dark:hover:text-rose-200 dark:hover:border-rose-400/60 dark:hover:bg-rose-500/12"
        disabled={isPending}
        onClick={onLeave}
      >
        {isPending ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Leaving…</> : 'Leave'}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="shrink-0 h-8 rounded-xl text-xs border-slate-300 dark:border-slate-600 cursor-pointer"
      disabled={isPending}
      onClick={onJoin}
    >
      {isPending ? <><Loader2 className="w-3 h-3 animate-spin mr-1" />Joining…</> : 'Join'}
    </Button>
  );
}
