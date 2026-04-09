'use client';

import { StrategyCard } from '@/components/dashboard/strategy/StrategyCard';
import { AddStrategyCard } from '@/components/dashboard/strategy/AddStrategyCard';
import { StrategyCardSkeleton } from './StrategyCardSkeleton';
import type { Strategy } from '@/types/strategy';
import type { StrategiesOverviewResult } from '@/lib/server/strategiesOverview';
import type { AccountRow, AccountMode } from '@/lib/server/accounts';

interface StrategyGridProps {
  strategies: ReadonlyArray<Strategy>;
  strategiesLoading: boolean;
  strategiesOverview: StrategiesOverviewResult | undefined;
  overviewLoading: boolean;
  activeAccount: AccountRow | null;
  mode: AccountMode;
  userId: string;
  currencySymbol: string;
  onEdit: (strategy: Strategy) => void;
  onDelete: (strategyId: string) => Promise<void>;
  onAdd: () => void;
  /** Reserved min-height so the grid doesn't shift when real cards swap in. */
  reservedCardCount: number;
}

export function StrategyGrid({
  strategies,
  strategiesLoading,
  strategiesOverview,
  overviewLoading,
  activeAccount,
  mode,
  userId,
  currencySymbol,
  onEdit,
  onDelete,
  onAdd,
  reservedCardCount,
}: StrategyGridProps) {
  const skeletonCount = Math.max(reservedCardCount || 0, 3);

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      style={{ contentVisibility: 'auto', containIntrinsicSize: `${Math.ceil(skeletonCount / 3) * 520}px` }}
    >
      {strategiesLoading ? (
        Array.from({ length: skeletonCount }).map((_, i) => (
          <StrategyCardSkeleton key={i} />
        ))
      ) : (
        <>
          {strategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              overviewStats={strategiesOverview?.[strategy.id]}
              accountId={activeAccount?.id ?? ''}
              mode={mode as 'live' | 'backtesting' | 'demo'}
              userId={userId}
              currencySymbol={currencySymbol}
              accountBalance={activeAccount?.account_balance}
              onEdit={onEdit}
              onDelete={onDelete}
              isLoading={overviewLoading}
            />
          ))}
          <AddStrategyCard onClick={onAdd} />
        </>
      )}
    </div>
  );
}
