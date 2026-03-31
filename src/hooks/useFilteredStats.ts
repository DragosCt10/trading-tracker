import { useMemo } from 'react';
import { Trade } from '@/types/trade';
import { computeStatsFromTrades } from '@/utils/computeStatsFromTrades';
import { calculateRiskPerTradeStats } from '@/utils/calculateRiskPerTrade';
import { calculateMarketStats } from '@/components/dashboard/analytics/MarketProfitStats';
import { calculateEvaluationStats } from '@/utils/calculateEvaluationStats';

interface UseFilteredStatsProps {
  viewMode: 'yearly' | 'dateRange';
  selectedMarket: string;
  selectedExecution: 'all' | 'executed' | 'nonExecuted';
  tradesToUse: Trade[];
  accountBalance?: number;
}

interface HookStats {
  setupStats: any[];
  liquidityStats: any[];
  directionStats: any[];
  localHLStats: any;
  slSizeStats: any[];
  reentryStats: any[];
  breakEvenStats: any[];
  trendStats: any[];
  intervalStats: any[];
  mssStats: any[];
  newsStats: any[];
  dayStats: any[];
  marketStats: any[];
}

interface UseFilteredStatsReturn {
  filteredChartStats: ReturnType<typeof computeStatsFromTrades> | null;
  filteredRiskStats: ReturnType<typeof calculateRiskPerTradeStats> | null;
  filteredMarketStats: ReturnType<typeof calculateMarketStats> | null;
  filteredEvaluationStats: ReturnType<typeof calculateEvaluationStats> | null;
  statsToUseForCharts: HookStats;
}

export function useFilteredStats({
  viewMode,
  selectedMarket,
  selectedExecution,
  tradesToUse,
  accountBalance = 0,
  hookStats,
}: UseFilteredStatsProps & { hookStats: HookStats }): UseFilteredStatsReturn {
  // All four stat families share the same guard conditions and the same deps array.
  // Consolidating into one useMemo avoids four identical guard evaluations and four
  // separate React memo subscriptions on every render — one pass to decide, one pass
  // per utility function when compute is needed.
  //
  // In yearly mode, execution filter doesn't apply — only a non-"all" market triggers
  // a client recompute. In dateRange mode, either a market filter or nonExecuted
  // execution triggers it.
  //
  // Returns null when no filter is active (the RPC-aggregated hookStats are already
  // correct) or when tradesToUse is empty (compact_trades not loaded → SQL-filtered
  // RPC stats are authoritative).
  const filteredStats = useMemo(() => {
    const shouldCompute =
      viewMode === 'yearly'
        ? selectedMarket !== 'all'
        : !(selectedMarket === 'all' && (selectedExecution === 'executed' || selectedExecution === 'all'));

    if (!shouldCompute || tradesToUse.length === 0) return null;

    return {
      chartStats: computeStatsFromTrades(tradesToUse),
      riskStats: calculateRiskPerTradeStats(tradesToUse),
      marketStats: calculateMarketStats(tradesToUse, accountBalance),
      evaluationStats: calculateEvaluationStats(tradesToUse),
    };
  }, [viewMode, selectedMarket, selectedExecution, tradesToUse, accountBalance]);

  return {
    filteredChartStats: filteredStats?.chartStats ?? null,
    filteredRiskStats: filteredStats?.riskStats ?? null,
    filteredMarketStats: filteredStats?.marketStats ?? null,
    filteredEvaluationStats: filteredStats?.evaluationStats ?? null,
    statsToUseForCharts: filteredStats?.chartStats ?? hookStats,
  };
}
