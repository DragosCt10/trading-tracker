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
  // Compute filtered statistics when filters are applied
  const filteredChartStats = useMemo(() => {
    // In yearly mode, execution filter doesn't apply, so only check market filter
    // In dateRange mode, if execution is nonExecuted, filter is applied
    if (viewMode === 'yearly') {
      if (selectedMarket === 'all') {
        return null; // Use hook stats
      }
    } else {
      if (selectedMarket === 'all' && (selectedExecution === 'executed' || selectedExecution === 'all')) {
        return null; // Use hook stats (executed/all is default, so no filter applied)
      }
    }
    // If compact_trades are not loaded (e.g. includeCompactTrades=false), fall back to
    // RPC stats which are already correctly filtered by market + execution in SQL.
    if (tradesToUse.length === 0) return null;
    return computeStatsFromTrades(tradesToUse);
  }, [tradesToUse, selectedMarket, selectedExecution, viewMode]);

  // Compute filtered risk stats when filters are applied
  // In yearly mode, only compute if market filter is applied (execution filter doesn't apply in yearly mode)
  // In dateRange mode, compute if either market or execution filter is applied
  const filteredRiskStats = useMemo(() => {
    if (viewMode === 'yearly') {
      if (selectedMarket === 'all') return null;
    } else {
      if (selectedMarket === 'all' && (selectedExecution === 'executed' || selectedExecution === 'all')) return null;
    }
    if (tradesToUse.length === 0) return null;
    return calculateRiskPerTradeStats(tradesToUse);
  }, [tradesToUse, selectedMarket, selectedExecution, viewMode]);

  // Compute filtered market stats when filters are applied
  // In yearly mode, only compute if market filter is applied (execution filter doesn't apply in yearly mode)
  // In dateRange mode, compute if either market or execution filter is applied
  const filteredMarketStats = useMemo(() => {
    if (viewMode === 'yearly') {
      if (selectedMarket === 'all') return null;
    } else {
      if (selectedMarket === 'all' && (selectedExecution === 'executed' || selectedExecution === 'all')) return null;
    }
    if (tradesToUse.length === 0) return null;
    return calculateMarketStats(tradesToUse, accountBalance);
  }, [tradesToUse, selectedMarket, selectedExecution, viewMode, accountBalance]);

  // Compute filtered evaluation stats when filters are applied
  // In yearly mode, only compute if market filter is applied (execution filter doesn't apply in yearly mode)
  // In dateRange mode, compute if either market or execution filter is applied
  const filteredEvaluationStats = useMemo(() => {
    if (viewMode === 'yearly') {
      if (selectedMarket === 'all') return null;
    } else {
      if (selectedMarket === 'all' && (selectedExecution === 'executed' || selectedExecution === 'all')) return null;
    }
    if (tradesToUse.length === 0) return null;
    return calculateEvaluationStats(tradesToUse);
  }, [tradesToUse, selectedMarket, selectedExecution, viewMode]);

  // Use filtered stats when filters are applied, otherwise use hook stats
  const statsToUseForCharts = filteredChartStats || hookStats;

  return {
    filteredChartStats,
    filteredRiskStats,
    filteredMarketStats,
    filteredEvaluationStats,
    statsToUseForCharts,
  };
}
