'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Hash, Globe, Lock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FeedChannel } from '@/types/social';

interface ChannelListItemProps {
  channel: FeedChannel;
  /** Compact = sidebar style (smaller, link-only, no separate action slot) */
  compact?: boolean;
  /** Action slot rendered to the right — only used when compact=false */
  action?: React.ReactNode;
}

/**
 * Renders one channel row.
 * - compact=false (default): `<div row> <Link logo+info> <action slot>`
 * - compact=true (sidebar):  `<Link logo+info+icon>` — no external action
 */
export default function ChannelListItem({ channel, compact = false, action }: ChannelListItemProps) {
  const logo = channel.logo_url ? (
    <Image
      src={channel.logo_url}
      alt={channel.name}
      className="w-full h-full object-cover"
      width={compact ? 28 : 32}
      height={compact ? 28 : 32}
    />
  ) : (
    <Hash className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
  );

  const logoWrapper = (
    <div
      className={cn(
        'rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700/60 overflow-hidden',
        compact ? 'w-7 h-7' : 'w-8 h-8',
      )}
    >
      {logo}
    </div>
  );

  const memberCount = channel.member_count != null && (
    <>
      <span className={cn('text-slate-300 dark:text-slate-700', compact ? 'text-[11px]' : 'text-xs')}>·</span>
      <span className={cn('flex items-center gap-1 text-slate-700 dark:text-slate-200', compact ? 'text-[11px]' : 'text-xs')}>
        <Users className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
        {channel.member_count}
      </span>
    </>
  );

  const infoBlock = (
    <div className="flex-1 min-w-0">
      <p className={cn('font-medium text-slate-800 dark:text-slate-200 truncate leading-5', compact ? 'text-xs' : 'text-sm')}>
        {channel.name}
      </p>
      <div className={cn('flex items-center mt-0.5', compact ? 'gap-1' : 'gap-1.5')}>
        <p className={cn('text-slate-500 dark:text-slate-500 truncate', compact ? 'text-[11px]' : 'text-xs')}>
          #{channel.slug}
        </p>
        {memberCount}
      </div>
    </div>
  );

  if (compact) {
    return (
      <Link
        href={`/feed/channel/${channel.slug}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 transition-colors"
      >
        {logoWrapper}
        {infoBlock}
        {channel.is_public
          ? <Globe className="w-3 h-3 text-slate-500 dark:text-slate-600 shrink-0" />
          : <Lock  className="w-3 h-3 text-slate-500 dark:text-slate-600 shrink-0" />
        }
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-100/70 dark:hover:bg-slate-800/40 transition-colors">
      <Link href={`/feed/channel/${channel.slug}`} className="flex items-center gap-3 flex-1 min-w-0">
        {logoWrapper}
        {infoBlock}
      </Link>
      {action}
    </div>
  );
}
