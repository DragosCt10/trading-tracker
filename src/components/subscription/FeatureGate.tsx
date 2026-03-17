'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
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
   * If true: render children with a blur + lock overlay instead of hiding completely.
   * Clicking the overlay opens the PaywallModal.
   */
  blurred?: boolean;
  /** Context passed to the PaywallModal when blurred=true */
  upgradeContext?: { title: string; description: string };
  children: React.ReactNode;
  className?: string;
}

export function FeatureGate({
  feature,
  limit,
  blurred = false,
  upgradeContext,
  children,
  className,
}: FeatureGateProps) {
  const { data: userDetails } = useUserDetails();
  const userId = userDetails?.user?.id;
  const { hasFeature, withinLimit } = useSubscription({ userId });
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Determine if access is allowed
  const allowed =
    feature !== undefined
      ? hasFeature(feature)
      : limit !== undefined
      ? withinLimit(limit.key, limit.current)
      : true;

  if (allowed) return <>{children}</>;

  // Hidden — render nothing
  if (!blurred) return null;

  // Blurred — render children with overlay
  return (
    <>
      <div
        className={cn('relative cursor-pointer select-none', className)}
        onClick={() => setPaywallOpen(true)}
        role="button"
        aria-label="Upgrade to PRO to unlock this feature"
      >
        {/* Blurred content */}
        <div className="pointer-events-none blur-sm brightness-75 saturate-0">
          {children}
        </div>

        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-black/40">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 ring-1 ring-amber-500/40">
            <Lock className="h-5 w-5 text-amber-400" />
          </div>
          <span className="text-xs font-medium text-white/80">PRO feature</span>
        </div>
      </div>

      {upgradeContext && (
        <PaywallModal
          open={paywallOpen}
          onClose={() => setPaywallOpen(false)}
          title={upgradeContext.title}
          description={upgradeContext.description}
        />
      )}
    </>
  );
}
