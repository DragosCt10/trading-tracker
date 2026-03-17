'use client';

import React, { useMemo } from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { Trade } from '@/types/trade';
import { formatRRMultipleValue } from './RRMultipleStatCard';
import { Crown } from 'lucide-react';

interface BestRRStatCardProps {
  tradesToUse: Trade[];
  isPro?: boolean;
}

/**
 * Best (max) risk-reward ratio among trades with a valid RR > 0.
 */
function getBestRR(trades: Trade[]): number | null {
  let best: number | null = null;
  for (const t of trades) {
    const rr = t.risk_reward_ratio;
    if (typeof rr === 'number' && !isNaN(rr) && rr > 0) {
      if (best === null || rr > best) best = rr;
    }
  }
  return best;
}

export const BestRRStatCard: React.FC<BestRRStatCardProps> = React.memo(
  function BestRRStatCard({ tradesToUse: rawTrades, isPro }) {
    const tradesToUse = useMemo(() => isPro ? rawTrades : [], [isPro, rawTrades]);
    const bestRR = useMemo(() => getBestRR(tradesToUse), [tradesToUse]);

    return (
      <StatCard
        title={
          <span className="flex items-center gap-2">
            Best RR
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
              <Crown className="w-3 h-3" /> PRO
            </span>
          </span>
        }
        value={
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {!isPro ? '—' : formatRRMultipleValue(bestRR)}
          </p>
        }
      />
    );
  }
);
