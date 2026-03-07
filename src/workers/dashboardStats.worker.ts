/// <reference lib="webworker" />

/**
 * Layer 3: Web Worker for market-filter re-computation.
 *
 * Receives the full compact_trades array (all executions, all markets) from
 * the TanStack Query cache, filters by market + execution, and runs all
 * stat functions off the main thread — zero network calls.
 */

import type { CompactTrade, RpcSeriesRow } from '@/types/dashboard-rpc';
import type { Trade } from '@/types/trade';
import { calculateFromSeries } from '@/utils/calculateFromSeries';
import { computeStatsFromTrades } from '@/utils/computeStatsFromTrades';
import { calculateMacroStats } from '@/utils/calculateMacroStats';
import { calculateEvaluationStats } from '@/utils/calculateEvaluationStats';
import { calculateRiskPerTradeStats } from '@/utils/calculateRiskPerTrade';
import { calculatePartialTradesStats } from '@/utils/calculatePartialTradesStats';
import { calculateAverageDaysBetweenTrades } from '@/utils/calculateAverageDaysBetweenTrades';
import { calculateTradeCounts } from '@/utils/calculateTradeCounts';
import { calculateWinRates } from '@/utils/calculateWinRates';
import { calculateProfit } from '@/utils/calculateProfit';
import { calculateRRStats } from '@/utils/calculateRMultiple';
import { calculateTradeQualityIndex } from '@/utils/calculateTradeQualityIndex';
import type { MacroStats, Stats } from '@/types/dashboard';
import type { EvaluationStat } from '@/utils/calculateEvaluationStats';
import type { RiskAnalysis } from '@/types/dashboard';

export interface WorkerInput {
  requestId: string;
  trades: CompactTrade[];
  accountBalance: number;
  market: string;
  execution: 'all' | 'executed' | 'nonExecuted';
}

export interface WorkerResult {
  stats: Stats;
  macroStats: MacroStats;
  evaluationStats: EvaluationStat[];
  riskStats: RiskAnalysis | null;
  setupStats: ReturnType<typeof computeStatsFromTrades>['setupStats'];
  liquidityStats: ReturnType<typeof computeStatsFromTrades>['liquidityStats'];
  directionStats: ReturnType<typeof computeStatsFromTrades>['directionStats'];
  intervalStats: ReturnType<typeof computeStatsFromTrades>['intervalStats'];
  mssStats: ReturnType<typeof computeStatsFromTrades>['mssStats'];
  newsStats: ReturnType<typeof computeStatsFromTrades>['newsStats'];
  dayStats: ReturnType<typeof computeStatsFromTrades>['dayStats'];
  marketStats: ReturnType<typeof computeStatsFromTrades>['marketStats'];
  slSizeStats: ReturnType<typeof computeStatsFromTrades>['slSizeStats'];
  localHLStats: ReturnType<typeof computeStatsFromTrades>['localHLStats'];
  reentryStats: ReturnType<typeof computeStatsFromTrades>['reentryStats'];
  breakEvenStats: ReturnType<typeof computeStatsFromTrades>['breakEvenStats'];
  trendStats: ReturnType<typeof computeStatsFromTrades>['trendStats'];
}

export interface WorkerOutput {
  requestId: string;
  result: WorkerResult;
}

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { requestId, trades, accountBalance, market, execution } = e.data;

  // ── Filter by market + execution ────────────────────────────────────────────
  let filtered = trades;
  if (market !== 'all') {
    filtered = filtered.filter(t => t.market === market);
  }
  if (execution === 'executed') {
    filtered = filtered.filter(t => t.executed);
  } else if (execution === 'nonExecuted') {
    filtered = filtered.filter(t => !t.executed);
  }

  // Cast CompactTrade[] → Trade[] (CompactTrade has all fields needed by calculate* utils)
  const asTrades = filtered as unknown as Trade[];

  // ── Category + reentry/BE/trend stats (single pass) ────────────────────────
  const categoryStats = computeStatsFromTrades(asTrades);

  // ── Core stats ──────────────────────────────────────────────────────────────
  const { winRate, winRateWithBE } = calculateWinRates(asTrades);
  const { totalProfit, averageProfit, averagePnLPercentage } = calculateProfit(asTrades, accountBalance);
  const { totalTrades, totalWins, totalLosses, beWins, beLosses } = calculateTradeCounts(asTrades);
  const averageDaysBetweenTrades = calculateAverageDaysBetweenTrades(asTrades);
  const multipleR = calculateRRStats(asTrades);
  const { partialWinningTrades, partialLosingTrades, partialBETrades, totalPartialTradesCount, totalPartialsBECount } =
    calculatePartialTradesStats(asTrades);

  // ── Time-series stats: sort then pass to calculateFromSeries ────────────────
  const sorted = [...filtered].sort((a, b) => {
    const d = a.trade_date.localeCompare(b.trade_date);
    return d !== 0 ? d : a.trade_time.localeCompare(b.trade_time);
  });
  const seriesStats = calculateFromSeries(sorted as unknown as RpcSeriesRow[], accountBalance);

  // ── Macro stats ─────────────────────────────────────────────────────────────
  const macroBase = calculateMacroStats(asTrades, accountBalance);

  // ── Evaluation + risk stats ─────────────────────────────────────────────────
  const evaluationStats = calculateEvaluationStats(asTrades);
  const riskStats = calculateRiskPerTradeStats(asTrades);

  const stats: Stats = {
    totalTrades,
    totalWins,
    totalLosses,
    winRate,
    winRateWithBE,
    totalProfit,
    averageProfit,
    averagePnLPercentage,
    maxDrawdown: seriesStats.maxDrawdown,
    averageDrawdown: 0,
    intervalStats: {} as Stats['intervalStats'],
    evaluationStats: [],
    beWins,
    beLosses,
    currentStreak: seriesStats.currentStreak,
    maxWinningStreak: seriesStats.maxWinningStreak,
    maxLosingStreak: seriesStats.maxLosingStreak,
    averageDaysBetweenTrades,
    partialWinningTrades,
    partialLosingTrades,
    partialBETrades,
    totalPartialTradesCount,
    totalPartialsBECount,
    tradeQualityIndex: seriesStats.tradeQualityIndex,
    multipleR,
  };

  const macroStats: MacroStats = {
    profitFactor: macroBase.profitFactor,
    consistencyScore: macroBase.consistencyScore,
    consistencyScoreWithBE: macroBase.consistencyScoreWithBE,
    sharpeWithBE: seriesStats.sharpeWithBE,
    tradeQualityIndex: seriesStats.tradeQualityIndex,
    multipleR,
  };

  (self as unknown as Worker).postMessage({
    requestId,
    result: {
      stats,
      macroStats,
      evaluationStats,
      riskStats,
      ...categoryStats,
    },
  } satisfies WorkerOutput);
};
