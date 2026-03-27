'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, Check, Ban, ShieldCheck, UserPlus, UserMinus, Activity, Trophy, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNotificationUnreadCount, useNotificationList, useNotificationActions } from '@/hooks/useNotifications';
import { formatFeedDate } from '@/utils/feedDateFormat';

interface NotificationBellProps {
  userId?: string;
  initialUnreadCount?: number;
}

function notifLabel(type: string): string {
  if (type === 'like')    return 'liked your post';
  if (type === 'comment') return 'commented on your post';
  if (type === 'follow')  return 'started following you';
  return '';
}

// Dot color per notification type
function dotColor(type: string): string {
  if (type === 'pro_3mo_discount' || type === 'trade_milestone_10' || type === 'account_unban') return 'bg-emerald-500';
  if (type === 'post_milestone') return 'bg-amber-500';
  if (type === 'channel_added') return 'bg-sky-500';
  if (type === 'channel_removed') return 'bg-amber-500';
  if (type === 'private_channel_added') return 'bg-violet-500';
  return 'bg-rose-500';
}

const NOTIF_CONFIG: Record<string, {
  Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  iconCls: string;
  title: string;
  body: string;
}> = {
  pro_3mo_discount:        { Icon: ShieldCheck, iconCls: 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400', title: 'PRO retention reward', body: 'Stay on PRO for 3 months and get 10% off your 4th month.' },
  trade_milestone_10:      { Icon: Activity,    iconCls: 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400', title: 'Trade milestones',      body: 'Reach 100 trades for 5% off, 500 for additional 15%, and 1000 trades for 20%.' },
  channel_added:           { Icon: UserPlus,    iconCls: 'bg-sky-500/15 dark:bg-sky-500/20 border-sky-500/30 text-sky-600 dark:text-sky-400',                    title: 'actor',                 body: 'added you to their channel.' },
  channel_removed:         { Icon: UserMinus,   iconCls: 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400',           title: 'actor',                 body: 'removed you from their channel.' },
  private_channel_added:   { Icon: UserPlus,    iconCls: 'bg-violet-500/15 dark:bg-violet-500/20 border-violet-500/30 text-violet-600 dark:text-violet-400',      title: 'actor',                 body: 'added you to their private channel.' },
  private_channel_removed: { Icon: UserMinus,   iconCls: 'bg-rose-500/15 dark:bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400',                title: 'actor',                 body: 'removed you from their private channel.' },
  account_unban:           { Icon: ShieldCheck, iconCls: 'bg-emerald-500/15 dark:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400', title: 'Moderation team',       body: 'restored your account access to the social feed.' },
  account_ban:             { Icon: Ban,         iconCls: 'bg-rose-500/15 dark:bg-rose-500/20 border-rose-500/30 text-rose-600 dark:text-rose-400',                title: 'Moderation team',       body: 'suspended your account from the social feed.' },
  post_milestone:          { Icon: Trophy,      iconCls: 'bg-amber-500/15 dark:bg-amber-500/20 border-amber-500/30 text-amber-600 dark:text-amber-400',           title: 'Community milestone',   body: "You're making great progress! Keep posting and commenting to earn your 15% PRO discount at 300 contributions." },
};

export default function NotificationBell({ userId, initialUnreadCount }: NotificationBellProps) {
  const [open, setOpen]                    = useState(false);
  const [showConfirmAll, setShowConfirmAll] = useState(false);
  const { data: unreadCount = 0 } = useNotificationUnreadCount(userId, initialUnreadCount);
  const { data, isFetching }      = useNotificationList(userId);
  const { markAll, markOne, deleteOne, deleteAllRead, deleteAll } = useNotificationActions(userId);

  const notifs        = data?.pages.flatMap((p) => p.items) ?? [];
  const hasAnyNotifs  = notifs.length > 0;
  const hasReadNotifs = notifs.some((n) => n.is_read);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'Notifications'}
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
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
          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-slate-200/70 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Notifications</h3>
              <div className="flex items-center gap-0.5">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 gap-1 px-2 cursor-pointer"
                    onClick={() => markAll.mutate()}
                    disabled={markAll.isPending}
                  >
                    <Check className="w-3 h-3" />
                    Mark all read
                  </Button>
                )}
                {hasAnyNotifs && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-rose-400 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 cursor-pointer"
                    onClick={() => setShowConfirmAll(true)}
                    disabled={deleteAll.isPending}
                    title="Delete all notifications"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {isFetching && notifs.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">Loading…</div>
            ) : notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">No new notifications</div>
            ) : (
              notifs.map((n) => {
                const rowClass = `group flex items-start gap-3 px-4 py-3 hover:bg-slate-100/90 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200/70 dark:border-slate-700/50 last:rounded-b-2xl last:border-b-0 ${!n.is_read ? 'bg-slate-100/70 dark:bg-slate-800/40' : ''}`;

                // Right-side slot: unread dot fades out on hover, × fades in.
                // Using a div wrapper (not a button) so it can nest inside <button> rows without hydration errors.
                const rightSlot = (
                  <div className="shrink-0 mt-1 w-4 h-4 relative flex items-center justify-center">
                    {!n.is_read && (
                      <div className={`w-2 h-2 rounded-full ${dotColor(n.type)} transition-opacity duration-150 group-hover:opacity-0`} />
                    )}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-label="Dismiss notification"
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded cursor-pointer text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteOne.mutate(n.id); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); deleteOne.mutate(n.id); } }}
                    >
                      <X className="w-3 h-3" />
                    </div>
                  </div>
                );

                const onRowActivate = () => {
                  if (!n.is_read) markOne.mutate(n.id);
                  setOpen(false);
                };

                const cfg = NOTIF_CONFIG[n.type];
                if (cfg) {
                  const { Icon, iconCls } = cfg;
                  const displayTitle = cfg.title === 'actor' ? n.actor.display_name : cfg.title;
                  return (
                    <button key={n.id} type="button" className={`${rowClass} w-full text-left cursor-pointer`} onClick={onRowActivate}>
                      <div className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${iconCls}`}>
                        <Icon className="w-3.5 h-3.5" aria-hidden />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{displayTitle}</span>
                          {' '}{cfg.body}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5" suppressHydrationWarning>{formatFeedDate(n.created_at)}</p>
                      </div>
                      {rightSlot}
                    </button>
                  );
                }

                // Social: like / comment / follow
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
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5" suppressHydrationWarning>{formatFeedDate(n.created_at)}</p>
                    </div>
                    {rightSlot}
                  </Link>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={showConfirmAll} onOpenChange={setShowConfirmAll}>
        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient !rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="text-red-500 dark:text-red-400 font-semibold text-lg">Confirm Delete</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-slate-600 dark:text-slate-400">Are you sure you want to delete all notifications? This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3">
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                onClick={() => setShowConfirmAll(false)}
                className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={() => { deleteAll.mutate(); setShowConfirmAll(false); }}
                className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 flex items-center gap-2"
              >
                Yes, Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
