import type { Trade } from '@/types/trade';
import type { DashboardApiResponse, DashboardRpcResult } from '@/types/dashboard-rpc';
import { computeStatsFromTrades } from '@/utils/computeStatsFromTrades';
import { calculateRiskPerTradeStats } from '@/utils/calculateRiskPerTrade';
import { calculateEvaluationStats } from '@/utils/calculateEvaluationStats';
import {
  calculateMaxDrawdown,
  calculateTradeQualityIndex,
  calculateProfitFactor,
  calculateConsistencyScore,
} from '@/utils/analyticsCalculations';
import { calculateStreaks } from '@/utils/calculateStreaks';
import { calculatePartialTradesStats } from '@/utils/calculatePartialTradesStats';
import { calcSharpe } from '@/utils/helpers/mathHelpers';
import { isLocalHighLowLiquidated } from '@/utils/calculateCategoryStats';
import { DEFAULT_RR } from '@/constants/tradingDefaults';

/**
 * Maximum trade count for client-side stat computation.
 * Above this, useDashboardData falls back to the RPC (SQL is more efficient for large datasets).
 */
export const CLIENT_COMPUTE_MAX_TRADES = 5_000;

// ── Monthly data ──────────────────────────────────────────────────────────────

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function computeMonthlyData(executedTrades: Trade[]): Pick<DashboardRpcResult, 'monthly_data' | 'best_month' | 'worst_month'> {
  const map = new Map<string, { wins: number; losses: number; beWins: number; beLosses: number; profit: number }>();

  for (const t of executedTrades) {
    if (!t.trade_date) continue;
    // Use month names as keys (matches RPC output and AccountOverviewCard lookup)
    const monthName = MONTH_NAMES[parseInt(t.trade_date.slice(5, 7), 10) - 1];
    if (!map.has(monthName)) map.set(monthName, { wins: 0, losses: 0, beWins: 0, beLosses: 0, profit: 0 });
    const m = map.get(monthName)!;
    m.profit += t.calculated_profit || 0;
    if (t.break_even) {
      if (t.trade_outcome === 'Win') m.beWins++;
      else if (t.trade_outcome === 'Lose') m.beLosses++;
    } else {
      if (t.trade_outcome === 'Win') m.wins++;
      else if (t.trade_outcome === 'Lose') m.losses++;
    }
  }

  const monthly_data: DashboardRpcResult['monthly_data'] = {};
  map.forEach((m, monthName) => {
    const nonBe = m.wins + m.losses;
    const total = nonBe + m.beWins + m.beLosses;
    monthly_data[monthName] = {
      wins: m.wins, losses: m.losses, beWins: m.beWins, beLosses: m.beLosses,
      profit: m.profit,
      winRate: nonBe > 0 ? (m.wins / nonBe) * 100 : 0,
      winRateWithBE: total > 0 ? (m.wins / total) * 100 : 0,
    };
  });

  let best_month: DashboardRpcResult['best_month'] = null;
  let worst_month: DashboardRpcResult['worst_month'] = null;
  for (const [month, stats] of Object.entries(monthly_data)) {
    if (!best_month || stats.profit > best_month.stats.profit) best_month = { month, stats };
    if (!worst_month || stats.profit < worst_month.stats.profit) worst_month = { month, stats };
  }

  return { monthly_data, best_month, worst_month };
}

// ── Non-executed DashboardRpcResult ──────────────────────────────────────────

function buildNonExecRpcResult(nonExecTrades: Trade[]): DashboardRpcResult {
  const cat = computeStatsFromTrades(nonExecTrades);
  const nonBE = nonExecTrades.filter(t => !t.break_even);
  const be  = nonExecTrades.filter(t => t.break_even);
  const wins   = nonBE.filter(t => t.trade_outcome === 'Win').length;
  const losses = nonBE.filter(t => t.trade_outcome === 'Lose').length;
  const beWins   = be.filter(t => t.trade_outcome === 'Win').length;
  const beLosses = be.filter(t => t.trade_outcome === 'Lose').length;
  const total   = nonExecTrades.length;
  const nonBeN  = wins + losses;
  const totalWB = nonBeN + beWins + beLosses;
  const totalProfit = nonExecTrades.reduce((s, t) => s + (t.calculated_profit || 0), 0);
  const { monthly_data, best_month, worst_month } = computeMonthlyData(nonExecTrades);
  const beS = cat.breakEvenStats[0] ?? { wins: 0, losses: 0, breakEven: 0, total: 0 };
  const re  = cat.reentryStats[0]  ?? { wins: 0, losses: 0, breakEven: 0, total: 0, winRate: 0, winRateWithBE: 0 };

  return {
    core: {
      totalTrades: total, totalWins: wins + beWins, beWins, totalLosses: losses + beLosses, beLosses,
      winRate: nonBeN > 0 ? (wins / nonBeN) * 100 : 0,
      winRateWithBE: totalWB > 0 ? (wins / totalWB) * 100 : 0,
      totalProfit, averageProfit: total > 0 ? totalProfit / total : 0,
      averagePnLPercentage: 0, multipleR: 0, averageDaysBetweenTrades: 0,
    },
    partials: calculatePartialTradesStats(nonExecTrades),
    macro: { profitFactor: 0, consistencyScore: 0, consistencyScoreWithBE: 0 },
    series_stats: { maxDrawdown: 0, currentStreak: 0, maxWinningStreak: 0, maxLosingStreak: 0, sharpeWithBE: 0, tradeQualityIndex: 0 },
    evaluation_stats: calculateEvaluationStats(nonExecTrades),
    risk_analysis: calculateRiskPerTradeStats(nonExecTrades) as DashboardRpcResult['risk_analysis'],
    monthly_data, best_month, worst_month,
    setup_stats: cat.setupStats, liquidity_stats: cat.liquidityStats, direction_stats: cat.directionStats,
    mss_stats: cat.mssStats, news_stats: cat.newsStats, day_stats: cat.dayStats,
    market_stats: cat.marketStats,
    local_hl_stats: {
      liquidated:    { ...cat.localHLStats.liquidated,    beWins: 0, beLosses: 0 },
      notLiquidated: { ...cat.localHLStats.notLiquidated, beWins: 0, beLosses: 0 },
    },
    interval_stats: cat.intervalStats, sl_size_stats: cat.slSizeStats,
    series: [], compact_trades: [],
    reentry_stats: [{ ...re, grp: 'Reentry' }],
    break_even_stats: { nonBeWins: beS.wins, nonBeLosses: beS.losses, beCount: beS.breakEven, total: beS.total },
    trend_stats: cat.trendStats,
    trade_months: [], earliest_trade_date: null,
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Computes a full DashboardApiResponse client-side from a Trade[] subset.
 *
 * Uses the same canonical functions as the SQL RPC:
 *  - calculateMaxDrawdown()        → matches SQL equity-curve drawdown
 *  - calculateStreaks()             → excludes BE, sorts by date+time
 *  - calculateTradeQualityIndex()  → population stdDev, R-values
 *  - calcSharpe()                  → sample Sharpe (n-1), R-values
 *  - computeStatsFromTrades()      → single O(n) pass for all category stats
 *
 * @param trades        Already date-filtered Trade[] (the subset for the requested range)
 * @param accountBalance  Account balance for drawdown / pnl % calculations
 * @param execution       'executed' | 'nonExecuted' | 'all'
 * @param market          Market filter string, or 'all' / '' for no filter
 */
export function computeAllDashboardStats(
  trades: Trade[],
  accountBalance: number,
  execution: 'all' | 'executed' | 'nonExecuted',
  market: string,
): DashboardApiResponse {
  // ── 1. Filter by market and execution ─────────────────────────────────────
  const marketFiltered = market === 'all' || !market
    ? trades
    : trades.filter(t => t.market === market);

  const tradesForStats =
    execution === 'nonExecuted' ? marketFiltered.filter(t => t.executed !== true)
    : execution === 'all'       ? marketFiltered
    :                             marketFiltered.filter(t => t.executed === true);

  const nonExecTrades = marketFiltered.filter(t => t.executed !== true);

  // ── 2. Profit trades (for balance-based calculations) ─────────────────────
  // When execution='all', only executed trades contribute to profit/drawdown (mirrors SQL).
  const profitTrades = execution === 'all'
    ? tradesForStats.filter(t => t.executed === true)
    : tradesForStats;

  // ── 3. Core classification ─────────────────────────────────────────────────
  const nonBEArr    = profitTrades.filter(t => !t.break_even);
  const beArr       = profitTrades.filter(t => t.break_even);
  const wins        = nonBEArr.filter(t => t.trade_outcome === 'Win').length;
  const losses      = nonBEArr.filter(t => t.trade_outcome === 'Lose').length;
  const beWins      = beArr.filter(t => t.trade_outcome === 'Win').length;
  const beLosses    = beArr.filter(t => t.trade_outcome === 'Lose').length;
  const totalWins   = wins + beWins;
  const totalLosses = losses + beLosses;
  const totalTrades = tradesForStats.length;
  const nonBeTotal  = wins + losses;
  const totalWithBE = wins + losses + beWins + beLosses;
  const totalProfit = profitTrades.reduce((s, t) => s + (t.calculated_profit || 0), 0);
  const averageProfit = profitTrades.length > 0 ? totalProfit / profitTrades.length : 0;
  const averagePnLPercentage = accountBalance > 0 ? (totalProfit / accountBalance) * 100 : 0;

  // ── 4. Average days between trades ────────────────────────────────────────
  const sortedDates = [...profitTrades]
    .sort((a, b) => a.trade_date.localeCompare(b.trade_date))
    .map(t => t.trade_date);
  let averageDaysBetweenTrades = 0;
  if (sortedDates.length > 1) {
    let sum = 0;
    for (let i = 1; i < sortedDates.length; i++) {
      sum += Math.ceil(Math.abs(new Date(sortedDates[i]).getTime() - new Date(sortedDates[i - 1]).getTime()) / 86_400_000);
    }
    averageDaysBetweenTrades = sum / (sortedDates.length - 1);
  }

  // ── 5. Series stats (single source of truth functions matching SQL) ────────
  const maxDrawdown = calculateMaxDrawdown(profitTrades, accountBalance);
  const { currentStreak, maxWinningStreak, maxLosingStreak } = calculateStreaks(profitTrades);
  const tradeQualityIndex = calculateTradeQualityIndex(profitTrades);

  const rValues: number[] = [];
  for (const t of profitTrades) {
    if (t.break_even) { rValues.push(0); continue; }
    if (t.trade_outcome === 'Win') {
      const rr = typeof t.risk_reward_ratio === 'number' && !isNaN(t.risk_reward_ratio) ? t.risk_reward_ratio : DEFAULT_RR;
      rValues.push(rr);
    } else if (t.trade_outcome === 'Lose') {
      rValues.push(-1);
    }
  }
  const sharpeWithBE = calcSharpe(rValues);
  const multipleR    = rValues.reduce((s, r) => s + r, 0);

  // ── 6. Category stats (single O(n) pass) ──────────────────────────────────
  const cat = computeStatsFromTrades(tradesForStats);

  // ── 7. localHL: add beWins/beLosses required by RpcLocalHLBucket ──────────
  let liqBeW = 0, liqBeL = 0, notLiqBeW = 0, notLiqBeL = 0;
  for (const t of tradesForStats) {
    if (!t.break_even) continue;
    if (isLocalHighLowLiquidated(t.local_high_low)) {
      if (t.trade_outcome === 'Win') liqBeW++; else if (t.trade_outcome === 'Lose') liqBeL++;
    } else {
      if (t.trade_outcome === 'Win') notLiqBeW++; else if (t.trade_outcome === 'Lose') notLiqBeL++;
    }
  }
  const local_hl_stats = {
    liquidated:    { ...cat.localHLStats.liquidated,    beWins: liqBeW,    beLosses: liqBeL    },
    notLiquidated: { ...cat.localHLStats.notLiquidated, beWins: notLiqBeW, beLosses: notLiqBeL },
  };

  // ── 8. Market stats with actual profit per market ─────────────────────────
  const mktProfitMap = new Map<string, number>();
  for (const t of profitTrades) {
    const m = t.market || 'Unknown';
    mktProfitMap.set(m, (mktProfitMap.get(m) ?? 0) + (t.calculated_profit || 0));
  }
  const market_stats = cat.marketStats.map(ms => ({
    ...ms,
    profit:        mktProfitMap.get(ms.market) ?? 0,
    pnlPercentage: accountBalance > 0 ? ((mktProfitMap.get(ms.market) ?? 0) / accountBalance) * 100 : 0,
  }));

  // ── 9. Reentry: 'Reentry' + 'No Reentry' groups ───────────────────────────
  const re = cat.reentryStats[0] ?? { wins: 0, losses: 0, breakEven: 0, total: 0, winRate: 0, winRateWithBE: 0 };
  const noReentryTrades = tradesForStats.filter(t => !t.reentry);
  const nrNonBE = noReentryTrades.filter(t => !t.break_even);
  const nrW     = nrNonBE.filter(t => t.trade_outcome === 'Win').length;
  const nrL     = nrNonBE.filter(t => t.trade_outcome === 'Lose').length;
  const nrBE    = noReentryTrades.filter(t => t.break_even).length;
  const nrTotal = noReentryTrades.length;
  const nrNBT   = nrW + nrL;
  const reentry_stats = [
    { ...re, grp: 'Reentry' },
    { grp: 'No Reentry', wins: nrW, losses: nrL, breakEven: nrBE, total: nrTotal,
      winRate: nrNBT > 0 ? (nrW / nrNBT) * 100 : 0,
      winRateWithBE: nrTotal > 0 ? (nrW / nrTotal) * 100 : 0 },
  ];

  // ── 10. break_even_stats: convert to RpcBreakEvenStats shape ──────────────
  const beS = cat.breakEvenStats[0] ?? { wins: 0, losses: 0, breakEven: 0, total: 0 };
  const break_even_stats = { nonBeWins: beS.wins, nonBeLosses: beS.losses, beCount: beS.breakEven, total: beS.total };

  // ── 11. Partials, risk, evaluation ────────────────────────────────────────
  const partials          = calculatePartialTradesStats(tradesForStats);
  const risk_analysis     = calculateRiskPerTradeStats(tradesForStats) as DashboardRpcResult['risk_analysis'];
  const evaluation_stats  = calculateEvaluationStats(tradesForStats);

  // ── 12. Monthly data + macro ──────────────────────────────────────────────
  const { monthly_data, best_month, worst_month } = computeMonthlyData(profitTrades);
  const consistencyScore = calculateConsistencyScore(monthly_data);
  const profitFactor     = calculateProfitFactor(profitTrades, totalWins, totalLosses);

  // ── 13. Trade months + earliest date ──────────────────────────────────────
  const monthSet = new Set<string>();
  let earliestDate: string | null = null;
  for (const t of tradesForStats) {
    if (!t.trade_date) continue;
    monthSet.add(t.trade_date.slice(0, 7));
    if (!earliestDate || t.trade_date < earliestDate) earliestDate = t.trade_date;
  }
  const trade_months = Array.from(monthSet).sort();

  // ── 14. Non-executed stats ─────────────────────────────────────────────────
  const nonExecutedStats = buildNonExecRpcResult(nonExecTrades);

  return {
    // ── RpcCore ──────────────────────────────────────────────────────────────
    core: {
      totalTrades, totalWins, beWins, totalLosses, beLosses,
      winRate:       nonBeTotal > 0 ? (wins / nonBeTotal) * 100 : 0,
      winRateWithBE: totalWithBE > 0 ? (wins / totalWithBE) * 100 : 0,
      totalProfit, averageProfit, averagePnLPercentage, multipleR, averageDaysBetweenTrades,
    },
    partials,
    macro: { profitFactor, consistencyScore, consistencyScoreWithBE: consistencyScore },
    series_stats: { maxDrawdown, currentStreak, maxWinningStreak, maxLosingStreak, sharpeWithBE, tradeQualityIndex },
    evaluation_stats,
    risk_analysis,
    monthly_data, best_month, worst_month,
    setup_stats:     cat.setupStats,
    liquidity_stats: cat.liquidityStats,
    direction_stats: cat.directionStats,
    mss_stats:       cat.mssStats,
    news_stats:      cat.newsStats,
    day_stats:       cat.dayStats,
    market_stats,
    local_hl_stats,
    interval_stats:  cat.intervalStats,
    sl_size_stats:   cat.slSizeStats,
    series: [],
    compact_trades: [],
    reentry_stats,
    break_even_stats,
    trend_stats:          cat.trendStats,
    trade_months,
    earliest_trade_date:  earliestDate,
    // ── DashboardApiResponse extra fields ────────────────────────────────────
    maxDrawdown, currentStreak, maxWinningStreak, maxLosingStreak,
    sharpeWithBE, tradeQualityIndex, multipleR,
    nonExecutedStats,
    nonExecutedTotalTradesCount: nonExecTrades.length,
    earliestTradeDate: earliestDate,
    tradeMonths: trade_months,
  };
}
