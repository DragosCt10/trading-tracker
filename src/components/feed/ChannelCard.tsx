'use client';

import Link from 'next/link';
import { Hash, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FeedChannel } from '@/types/social';

interface ChannelCardProps {
  channel: FeedChannel;
  isMember?: boolean;
  onJoin?: (channelId: string) => void;
  onLeave?: (channelId: string) => void;
  isOwn?: boolean;
}

export default function ChannelCard({ channel, isMember, onJoin, onLeave, isOwn }: ChannelCardProps) {
  return (
    <div className="flex items-start gap-3 px-4 py-4 rounded-2xl border border-slate-700/60 bg-slate-900/40 hover:bg-slate-800/40 transition-colors">
      {/* Icon */}
      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700/60">
        <Hash className="w-4 h-4 text-slate-400" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/feed/channel/${channel.slug}`}
            className="text-sm font-semibold text-slate-100 hover:text-slate-50 truncate"
          >
            {channel.name}
          </Link>
          {channel.is_public
            ? <Globe className="w-3 h-3 text-slate-500 shrink-0" />
            : <Lock className="w-3 h-3 text-slate-500 shrink-0" />
          }
        </div>
        {channel.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{channel.description}</p>
        )}
        <p className="text-xs text-slate-600 mt-1">#{channel.slug}</p>
      </div>

      {/* Action */}
      {!isOwn && (
        isMember
          ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-500 hover:text-slate-300 border border-slate-700/60 h-7"
              onClick={() => onLeave?.(channel.id)}
            >
              Leave
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-300 hover:text-slate-100 border border-slate-600/60 h-7"
              onClick={() => onJoin?.(channel.id)}
            >
              Join
            </Button>
          )
      )}
    </div>
  );
}
