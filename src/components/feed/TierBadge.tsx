'use client';

import { Crown, Sparkles } from 'lucide-react';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import type { TierId } from '@/types/subscription';
import { cn } from '@/lib/utils';

interface TierBadgeProps {
  tier: TierId;
  isLightMode: boolean;
}

export default function TierBadge({ tier, isLightMode: _isLightMode }: TierBadgeProps) {
  const isPro = tier === 'pro' || tier === 'elite';

  const tierDef = TIER_DEFINITIONS[tier];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 select-none border',
        isPro
          ? 'border-[rgba(180,83,9,0.45)] bg-slate-50/80 dark:border-[rgba(251,191,36,0.45)] dark:bg-transparent'
          : 'border-[var(--tc-border)]'
      )}
    >
      {isPro
        ? <Crown className="h-3 w-3 shrink-0 text-[#b45309] dark:text-[#fbbf24]" />
        : <Sparkles className="h-3 w-3 shrink-0" style={{ color: 'var(--tc-primary)' }} />
      }
      <span
        className={cn(
          'text-[10px] font-bold uppercase tracking-widest',
          isPro && 'text-[#b45309] dark:text-transparent dark:bg-clip-text dark:bg-[linear-gradient(135deg,#fbbf24_0%,#d97706_50%,#b45309_100%)]'
        )}
        style={!isPro
          ? {
              backgroundImage: 'linear-gradient(135deg, var(--tc-primary) 0%, var(--tc-accent) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }
          : undefined}
      >
        {tierDef.badge.label}
      </span>
    </span>
  );
}
