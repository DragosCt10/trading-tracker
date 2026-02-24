'use client';

import React, { useMemo } from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';
import { Trade } from '@/types/trade';
import { formatRRMultipleValue } from './RRMultipleStatCard';

interface BestRRStatCardProps {
  tradesToUse: Trade[];
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
  function BestRRStatCard({ tradesToUse }) {
    const bestRR = useMemo(() => getBestRR(tradesToUse), [tradesToUse]);

    return (
      <StatCard
        title="Best RR"
        value={
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {formatRRMultipleValue(bestRR)}
          </p>
        }
      />
    );
  }
);
