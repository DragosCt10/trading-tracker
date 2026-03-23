'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotificationUnreadCount, useNotificationList, useMarkNotifications } from '@/hooks/useNotifications';
import { formatFeedDate } from '@/utils/feedDateFormat';

interface NotificationBellProps {
  userId?: string;
}

function notifLabel(type: string): string {
  if (type === 'like')    return 'liked your post';
  if (type === 'comment') return 'commented on your post';
  if (type === 'follow')  return 'started following you';
  return '';
}


export default function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useNotificationUnreadCount(userId);
  const { data, isFetching }      = useNotificationList(userId);
  const { markAll, markOne }      = useMarkNotifications(userId);

  const notifs = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative cursor-pointer h-8 w-8 rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 p-0 flex items-center justify-center transition-colors duration-200"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 z-[100] rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-0"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-slate-700/50">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 gap-1"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <Check className="w-3 h-3" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isFetching && notifs.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
          ) : notifs.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">No notifications yet</div>
          ) : (
            notifs.map((n) => (
              <Link
                key={n.id}
                href={n.post_id ? `/feed/post/${n.post_id}` : `/profile/${n.actor.username}`}
                onClick={() => {
                  if (!n.is_read) markOne.mutate(n.id);
                  setOpen(false);
                }}
                className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-100/90 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200/70 dark:border-slate-700/50 last:border-0 ${!n.is_read ? 'bg-slate-100/70 dark:bg-slate-800/40' : ''}`}
              >
                {/* Actor avatar */}
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-xs font-semibold shrink-0">
                  {n.actor.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={n.actor.avatar_url} alt={n.actor.display_name} className="w-full h-full rounded-full object-cover" />
                    : String(n.actor.display_name ?? '?').slice(0, 1).toUpperCase()
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{n.actor.display_name}</span>
                    {' '}{notifLabel(n.type)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5" suppressHydrationWarning>
                    {formatFeedDate(n.created_at)}
                  </p>
                </div>

                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                )}
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
