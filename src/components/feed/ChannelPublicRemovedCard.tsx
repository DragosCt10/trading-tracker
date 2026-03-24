'use client';

import { UserRoundX } from 'lucide-react';
import { FEED_CARD_SURFACE_CLASS } from './feedCardStyles';

/**
 * Shown on a public channel when the owner removed the viewer — same shell width/style as the composer.
 */
export default function ChannelPublicRemovedCard() {
  return (
    <div className={FEED_CARD_SURFACE_CLASS}>
      <div className="p-5 flex gap-4">
        <div className="shrink-0 p-2.5 rounded-xl themed-header-icon-box h-fit">
          <UserRoundX className="w-6 h-6 text-slate-600 dark:text-slate-300" aria-hidden />
        </div>
        <div className="min-w-0 space-y-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
            You were removed from this channel
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            The channel owner removed you from this public channel. Until they add you back, you cannot{' '}
            <span className="font-medium text-slate-700 dark:text-slate-300">post or comment</span> here. You can still
            browse posts and like them.
          </p>
        </div>
      </div>
    </div>
  );
}
