'use client';

import { TIER_DEFINITIONS } from '@/constants/tiers';
import type { TierId } from '@/types/subscription';
import { cn } from '@/lib/utils';

interface TierBadgeProps {
  tier: TierId;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  if (tier === 'starter') return null;

  const { badge } = TIER_DEFINITIONS[tier];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        badge.colorClass,
        className
      )}
    >
      {badge.label}
    </span>
  );
}
