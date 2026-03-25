'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Check, Ban, ShieldCheck, UserPlus, Activity } from 'lucide-react';
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
  if (type === 'account_ban') return '';
  return '';
}


export default function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: unreadCount = 0 } = useNotificationUnreadCount(userId);
  const { data, isFetching }      = useNotificationList(userId);
  const { markAll, markOne }      = useMarkNotifications(userId);

  const notifs = data?.pages.flatMap((p) => p.items) ?? [];
  const offerDate = formatFeedDate(new Date().toISOString());

  const defaultOffers = [
    {
      key: 'pro-3mo-discount',
      icon: ShieldCheck,
      iconBg: 'bg-sky-500/15 dark:bg-sky-500/20 border border-sky-500/30',
      iconColor: 'text-sky-600 dark:text-sky-400',
      title: 'PRO retention reward',
      message: 'Stay on PRO for 3 months and get 10% off your 4th month.',
    },
    {
      key: 'trade-milestones-discount',
      icon: Activity,
      iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      title: 'Trade milestones',
      message: 'Reach 100 trades for 5% off, 500 for additional 15%, and 1000 trades for 20%.',
    },
  ] as const;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'Notifications'}
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          }
          className="relative overflow-visible cursor-pointer h-8 w-8 rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 p-0 flex items-center justify-center transition-colors duration-200"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 min-h-[1.125rem] min-w-[1.125rem] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-md ring-2 ring-white dark:ring-slate-900 z-10 tabular-nums"
              aria-hidden
            >
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
          {defaultOffers.map(({ key, icon: OfferIcon, iconBg, iconColor, title, message }) => {
            const offerRowClass = `flex items-start gap-3 px-4 py-3 hover:bg-slate-100/90 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200/70 dark:border-slate-700/50 last:rounded-b-2xl last:border-b-0 ${key ? 'bg-white/10 dark:bg-black/10' : ''}`;

            return (
              <div key={key} className={offerRowClass} role="status">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}
                  aria-hidden
                >
                  <OfferIcon className="w-3.5 h-3.5" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{title}</span>
                    {' '}{message}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5" suppressHydrationWarning>
                    {offerDate}
                  </p>
                </div>
              </div>
            );
          })}

          {isFetching && notifs.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
          ) : notifs.length === 0 ? null : (
            notifs.map((n) => {
              const rowClass = `flex items-start gap-3 px-4 py-3 hover:bg-slate-100/90 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200/70 dark:border-slate-700/50 last:rounded-b-2xl last:border-b-0 ${!n.is_read ? 'bg-slate-100/70 dark:bg-slate-800/40' : ''}`;

              const onRowActivate = () => {
                if (!n.is_read) markOne.mutate(n.id);
                setOpen(false);
              };

              if (n.type === 'channel_added') {
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`${rowClass} w-full text-left cursor-pointer`}
                    onClick={onRowActivate}
                  >
                    <div className="w-7 h-7 rounded-full bg-sky-500/15 dark:bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
                      <UserPlus className="w-3.5 h-3.5" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{n.actor.display_name}</span>
                        {' '}added you to his channel.
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5" suppressHydrationWarning>
                        {formatFeedDate(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1" />
                    )}
                  </button>
                );
              }

              if (n.type === 'account_unban') {
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`${rowClass} w-full text-left cursor-pointer`}
                    onClick={onRowActivate}
                  >
                    <div className="w-7 h-7 rounded-full bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">Moderation team</span>
                        {' '}restored your account access to the social feed.
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5" suppressHydrationWarning>
                        {formatFeedDate(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" />
                    )}
                  </button>
                );
              }

              if (n.type === 'account_ban') {
                return (
                  <button
                    key={n.id}
                    type="button"
                    className={`${rowClass} w-full text-left cursor-pointer`}
                    onClick={onRowActivate}
                  >
                    <div className="w-7 h-7 rounded-full bg-rose-500/15 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                      <Ban className="w-3.5 h-3.5" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">Moderation team</span>
                        {' '}suspended your account from the social feed.
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5" suppressHydrationWarning>
                        {formatFeedDate(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                    )}
                  </button>
                );
              }

              return (
                <Link
                  key={n.id}
                  href={n.post_id ? `/feed/post/${n.post_id}` : `/profile/${n.actor.username}`}
                  onClick={onRowActivate}
                  className={rowClass}
                >
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
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
