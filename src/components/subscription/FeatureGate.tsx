'use client';

import { useState } from 'react';
import { Crown } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserDetails } from '@/hooks/useUserDetails';
import type { TierFeatureFlags, TierLimits } from '@/types/subscription';
import { cn } from '@/lib/utils';
import { PaywallModal } from './PaywallModal';

interface FeatureGateProps {
  /** Gate by feature flag */
  feature?: keyof TierFeatureFlags;
  /** Gate by a count-based limit */
  limit?: { key: keyof TierLimits; current: number };
  /**
   * @deprecated kept for backwards-compat — all locked states now use the badge design.
   */
  blurred?: boolean;
  /** Context passed to the PaywallModal and shown as the locked-state message */
  upgradeContext?: { title: string; description: string };
  children: React.ReactNode;
  className?: string;
}

export function FeatureGate({
  feature,
  limit,
  blurred: _blurred,
  upgradeContext,
  children,
  className,
}: FeatureGateProps) {
  const { data: userDetails } = useUserDetails();
  const userId = userDetails?.user?.id;
  const { hasFeature, withinLimit } = useSubscription({ userId });
  const [paywallOpen, setPaywallOpen] = useState(false);

  const allowed =
    feature !== undefined
      ? hasFeature(feature)
      : limit !== undefined
      ? withinLimit(limit.key, limit.current)
      : true;

  if (allowed) return <>{children}</>;

  // Locked — render a clean "PRO - Unlock" empty state card (no ghost children).
  return (
    <>
      <div
        className={cn(
          'w-full min-h-[200px] flex flex-col items-center justify-center gap-3',
          'rounded-xl border border-dashed border-amber-300/60 dark:border-amber-500/30',
          'bg-amber-50/40 dark:bg-amber-900/10 cursor-pointer px-6 py-10',
          className,
        )}
        onClick={() => setPaywallOpen(true)}
        role="button"
        aria-label="Upgrade to PRO to unlock this feature"
      >
        {/* Crown icon */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40">
          <Crown className="w-5 h-5 text-amber-500" />
        </div>

        {/* PRO badge */}
        <span className="text-xs font-semibold tracking-widest uppercase text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
          PRO
        </span>

        {/* Title + description */}
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 text-center">
          {upgradeContext?.title ?? 'Upgrade to PRO'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-xs">
          {upgradeContext?.description ?? 'Upgrade to unlock this feature'}
        </p>

        {/* CTA */}
        <span className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400 underline underline-offset-2">
          Unlock feature →
        </span>
      </div>

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        title={upgradeContext?.title}
        description={upgradeContext?.description}
      />
    </>
  );
}
