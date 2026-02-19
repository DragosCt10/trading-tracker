'use client';

import React from 'react';
import { StatCard } from '@/components/dashboard/analytics/StatCard';

interface TotalTradesStatCardProps {
  totalTrades: number;
}

export const TotalTradesStatCard: React.FC<TotalTradesStatCardProps> = React.memo(
  function TotalTradesStatCard({ totalTrades }) {
    return (
      <StatCard
        title="Total Trades"
        value={
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {totalTrades}
          </p>
        }
      />
    );
  }
);
