'use client';

import { Globe, Hash, UserPlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import PostCardSkeleton from '@/components/feed/PostCardSkeleton';
import CreatePostCardSkeleton from '@/components/feed/CreatePostCardSkeleton';

function ChannelRowSkeleton({ size = 'md' }: { size?: 'sm' | 'md' }) {
  if (size === 'sm') {
    return (
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <Skeleton className="w-6 h-6 rounded-lg shrink-0" />
        <div className="flex-1 min-w-0 space-y-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-2.5 w-16" />
        </div>
        <Skeleton className="w-3 h-3 rounded shrink-0" />
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="w-11 h-6 rounded-full shrink-0" />
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl sm:px-0 py-6">
      <div className="flex gap-6 items-stretch min-h-0 h-[calc(100dvh-8rem)] max-h-[calc(100dvh-8rem)]">

        {/* ── Main feed column ── */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-6">

          {/* Tab bar — static, no skeleton */}
          <div className="shrink-0 flex gap-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20 p-1 backdrop-blur-sm">
            {(
              [
                { label: 'Public', Icon: Globe },
                { label: 'Following', Icon: UserPlus },
                { label: 'Channels', Icon: Hash },
              ] as const
            ).map(({ label, Icon }, i) => (
              <div
                key={label}
                className={`flex-1 rounded-xl px-4 py-2 min-h-[2.75rem] flex items-center justify-center gap-1.5 text-sm font-semibold ${
                  i === 0
                    ? 'text-slate-900 dark:text-slate-50 shadow-sm border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/30'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {label}
              </div>
            ))}
          </div>

          {/* Composer skeleton — same shell as InlineCreatePostCard */}
          <div className="shrink-0">
            <CreatePostCardSkeleton />
          </div>

          {/* Feed posts skeleton */}
          <div className="flex-1 min-h-0 overflow-y-hidden pr-1 -mr-1">
            <div>
              {Array.from({ length: 3 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside className="hidden lg:flex flex-col gap-6 w-72 shrink-0 self-start">

          {/* Search bar skeleton */}
          <div className="shrink-0 rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-3">
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>

          {/* Channels panel skeleton */}
          <div className="flex flex-col rounded-2xl border border-slate-300/40 dark:border-slate-700/55 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden">
            {/* Header — static */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/40">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">Channels</span>
            </div>
            <div className="divide-y divide-slate-200/80 dark:divide-slate-800/60">
              {Array.from({ length: 3 }).map((_, i) => (
                <ChannelRowSkeleton key={i} size="sm" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
