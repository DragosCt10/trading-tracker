'use client';

import type { CSSProperties } from 'react';
import { Crown, Sparkles } from 'lucide-react';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import type { TierId } from '@/types/subscription';

interface TierBadgeProps {
  tier: TierId;
  isLightMode: boolean;
}

export default function TierBadge({ tier, isLightMode }: TierBadgeProps) {
  const isPro = tier === 'pro' || tier === 'elite';

  const proIconColor    = isLightMode ? '#b45309' : '#fbbf24';
  const proBorderColor  = isLightMode ? 'rgba(180,83,9,0.45)' : 'rgba(251,191,36,0.45)';
  const proTextStyle: CSSProperties = isLightMode
    ? { color: '#b45309' }
    : {
        backgroundImage: 'linear-gradient(135deg, #fbbf24 0%, #d97706 50%, #b45309 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      };

  const tierDef = TIER_DEFINITIONS[tier];

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 select-none"
      style={isPro ? { border: `1px solid ${proBorderColor}` } : { border: '1px solid var(--tc-border)' }}
    >
      {isPro
        ? <Crown className="h-3 w-3 shrink-0" style={{ color: proIconColor }} />
        : <Sparkles className="h-3 w-3 shrink-0" style={{ color: 'var(--tc-primary)' }} />
      }
      <span
        className="text-[10px] font-bold uppercase tracking-widest"
        style={
          isPro
            ? proTextStyle
            : {
                backgroundImage: 'linear-gradient(135deg, var(--tc-primary) 0%, var(--tc-accent) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }
        }
      >
        {tierDef.badge.label}
      </span>
    </span>
  );
}
