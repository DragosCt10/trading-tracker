// src/utils/detectTradingPatterns.ts
import type { Trade } from '@/types/trade';
import type { PeriodMetrics } from '@/utils/calculatePeriodMetrics';
import {
  calculateMarketStats,
  calculateGroupedStats,
  calculateDayStats,
  calculateNewsStats,
  calculateIntervalStats,
  type GroupStats,
} from '@/utils/calculateCategoryStats';
import { TIME_INTERVALS } from '@/constants/analytics';

// ─── Types ──────────────────────────────────────────────────────────────────

export type PatternType = 'strength' | 'weakness' | 'insight' | 'warning';

export interface DetectedPattern {
  id: string;
  type: PatternType;
  title: string;
  description: string;
  priority: number; // lower = shown first
  periods?: string[];
}

// ─── Config ─────────────────────────────────────────────────────────────────

const MIN_TRADES_DEFAULT = 5;
const MIN_TRADES_RISK = 10;
const MIN_TRADES_PSYCHOLOGY = 10;
const MIN_TRADES_TIME = 20;
const WIN_RATE_GOOD = 55;
const WIN_RATE_BAD = 45;
const DIRECTION_GAP_PP = 15;
const TREND_DELTA_PP = 5;

// ─── Private helpers ────────────────────────────────────────────────────────

interface BestWorstConfig {
  category: string; // e.g. "market", "session"
  idPrefix: string;
  minPerGroup: number;
  minGroups: number;
  goodThreshold: number;
  badThreshold: number;
}

/** Emit strength/weakness patterns for the best/worst group by win rate. */
function emitBestWorst(stats: GroupStats[], cfg: BestWorstConfig): DetectedPattern[] {
  const valid = stats.filter((s) => s.type !== 'Unknown' && s.total >= cfg.minPerGroup);
  if (valid.length < cfg.minGroups) return [];

  const sorted = [...valid].sort((a, b) => b.winRate - a.winRate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const patterns: DetectedPattern[] = [];

  if (best && best.winRate >= cfg.goodThreshold) {
    patterns.push({
      id: `${cfg.idPrefix}-best`,
      type: 'strength',
      title: `Best ${cfg.category}: ${best.type}`,
      description: `${best.winRate.toFixed(1)}% win rate across ${best.total} trades.`,
      priority: 5,
    });
  }

  if (worst && worst.winRate <= cfg.badThreshold && worst.type !== best?.type) {
    patterns.push({
      id: `${cfg.idPrefix}-worst`,
      type: 'weakness',
      title: `Weakest ${cfg.category}: ${worst.type}`,
      description: `${worst.winRate.toFixed(1)}% win rate across ${worst.total} trades.`,
      priority: 3,
    });
  }

  return patterns;
}

/** Compute win rate for trades matching a predicate (excluding BE). Single-pass. */
function groupWinRate(trades: Trade[], predicate: (t: Trade) => boolean): { winRate: number; count: number } {
  let count = 0, wins = 0, losses = 0;
  for (const t of trades) {
    if (!predicate(t)) continue;
    count++;
    if (t.break_even) continue;
    if (t.trade_outcome === 'Win') wins++;
    else if (t.trade_outcome === 'Lose') losses++;
  }
  const denom = wins + losses;
  return { winRate: denom > 0 ? (wins / denom) * 100 : 0, count };
}

// ─── Individual detectors ───────────────────────────────────────────────────

function detectDirectionBias(metrics: PeriodMetrics): DetectedPattern[] {
  if (metrics.tradeCount < 10) return [];
  const gap = metrics.longWinRate - metrics.shortWinRate;
  if (Math.abs(gap) < DIRECTION_GAP_PP) return [];

  const better = gap > 0 ? 'long' : 'short';
  const worse = gap > 0 ? 'short' : 'long';
  const betterRate = gap > 0 ? metrics.longWinRate : metrics.shortWinRate;
  const worseRate = gap > 0 ? metrics.shortWinRate : metrics.longWinRate;

  return [
    {
      id: 'direction-bias',
      type: 'insight',
      title: `${better.charAt(0).toUpperCase() + better.slice(1)} trades outperform`,
      description: `${better.charAt(0).toUpperCase() + better.slice(1)}s win at ${betterRate.toFixed(1)}% vs ${worseRate.toFixed(1)}% for ${worse}s (${Math.abs(gap).toFixed(0)}pp gap).`,
      priority: 7,
    },
  ];
}

function detectMarketPatterns(trades: Trade[], accountBalance: number): DetectedPattern[] {
  const stats = calculateMarketStats(trades, accountBalance);
  const cfg: BestWorstConfig = {
    category: 'market',
    idPrefix: 'market',
    minPerGroup: MIN_TRADES_DEFAULT,
    minGroups: 2,
    goodThreshold: WIN_RATE_GOOD,
    badThreshold: WIN_RATE_BAD,
  };
  return emitBestWorst(
    stats.map((s) => ({
      type: s.market,
      total: s.total,
      wins: s.wins,
      losses: s.losses,
      winRate: s.winRate,
      winRateWithBE: s.winRateWithBE,
      breakEven: s.breakEven,
      tradeType: s.market,
    })),
    cfg,
  );
}

function detectSessionPatterns(trades: Trade[]): DetectedPattern[] {
  const stats = calculateGroupedStats(trades, (t) => t.session || 'Unknown');
  return emitBestWorst(stats, {
    category: 'session',
    idPrefix: 'session',
    minPerGroup: MIN_TRADES_DEFAULT,
    minGroups: 2,
    goodThreshold: WIN_RATE_GOOD,
    badThreshold: WIN_RATE_BAD,
  });
}

function detectSetupPatterns(trades: Trade[]): DetectedPattern[] {
  const stats = calculateGroupedStats(trades, (t) => t.setup_type || 'Unknown');
  return emitBestWorst(stats, {
    category: 'setup',
    idPrefix: 'setup',
    minPerGroup: MIN_TRADES_DEFAULT,
    minGroups: 2,
    goodThreshold: WIN_RATE_GOOD,
    badThreshold: WIN_RATE_BAD,
  });
}

function detectMssPatterns(trades: Trade[]): DetectedPattern[] {
  const stats = calculateGroupedStats(trades, (t) => t.mss || 'Unknown');
  return emitBestWorst(stats, {
    category: 'MSS pattern',
    idPrefix: 'mss',
    minPerGroup: MIN_TRADES_DEFAULT,
    minGroups: 2,
    goodThreshold: WIN_RATE_GOOD,
    badThreshold: WIN_RATE_BAD,
  });
}

function detectLiquidityPatterns(trades: Trade[]): DetectedPattern[] {
  const stats = calculateGroupedStats(trades, (t) => t.liquidity || 'Unknown');
  return emitBestWorst(stats, {
    category: 'liquidity',
    idPrefix: 'liquidity',
    minPerGroup: MIN_TRADES_DEFAULT,
    minGroups: 2,
    goodThreshold: WIN_RATE_GOOD,
    badThreshold: WIN_RATE_BAD,
  });
}

function detectDisplacementPatterns(trades: Trade[]): DetectedPattern[] {
  const withDisp = trades.filter((t) => typeof t.displacement_size === 'number' && t.displacement_size > 0);
  if (withDisp.length < MIN_TRADES_RISK) return [];

  const bucketLabel = (size: number): string => {
    if (size <= 1) return 'Small (≤1)';
    if (size <= 2) return 'Medium (1-2)';
    return 'Large (>2)';
  };

  const stats = calculateGroupedStats(withDisp, (t) => bucketLabel(t.displacement_size));
  return emitBestWorst(stats, {
    category: 'displacement',
    idPrefix: 'displacement',
    minPerGroup: 3,
    minGroups: 2,
    goodThreshold: WIN_RATE_GOOD,
    badThreshold: WIN_RATE_BAD,
  });
}

function detectFvgSizePatterns(trades: Trade[]): DetectedPattern[] {
  const withFvg = trades.filter((t) => typeof t.fvg_size === 'number' && t.fvg_size != null && t.fvg_size > 0);
  if (withFvg.length < MIN_TRADES_RISK) return [];

  const bucketLabel = (size: number): string => {
    if (size <= 1) return 'Small (≤1)';
    if (size <= 2) return 'Medium (1-2)';
    return 'Large (>2)';
  };

  const stats = calculateGroupedStats(withFvg, (t) => bucketLabel(t.fvg_size!));
  return emitBestWorst(stats, {
    category: 'FVG size',
    idPrefix: 'fvg',
    minPerGroup: 3,
    minGroups: 2,
    goodThreshold: WIN_RATE_GOOD,
    badThreshold: WIN_RATE_BAD,
  });
}

function detectDayPatterns(trades: Trade[]): DetectedPattern[] {
  const dayStats = calculateDayStats(trades);
  return emitBestWorst(
    dayStats.map((d) => ({
      type: d.day,
      total: d.total,
      wins: d.wins,
      losses: d.losses,
      winRate: d.winRate,
      winRateWithBE: d.winRateWithBE,
      breakEven: d.breakEven,
      tradeType: d.day,
    })),
    {
      category: 'day',
      idPrefix: 'day',
      minPerGroup: 3,
      minGroups: 3,
      goodThreshold: WIN_RATE_GOOD,
      badThreshold: WIN_RATE_BAD,
    },
  );
}

function detectStreakPatterns(metrics: PeriodMetrics): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  if (metrics.currentStreak <= -3) {
    patterns.push({
      id: 'streak-losing',
      type: 'warning',
      title: `${Math.abs(metrics.currentStreak)}-trade losing streak`,
      description: `Currently on a ${Math.abs(metrics.currentStreak)}-trade losing streak. Consider reducing position size.`,
      priority: 1,
    });
  } else if (metrics.currentStreak >= 5) {
    patterns.push({
      id: 'streak-winning',
      type: 'strength',
      title: `${metrics.currentStreak}-trade winning streak`,
      description: `On a ${metrics.currentStreak}-trade winning streak. Stay disciplined.`,
      priority: 5,
    });
  }

  if (metrics.maxWinStreak >= 5) {
    patterns.push({
      id: 'streak-record-win',
      type: 'insight',
      title: `Record win streak: ${metrics.maxWinStreak}`,
      description: `Best winning streak of ${metrics.maxWinStreak} consecutive trades.`,
      priority: 8,
    });
  }

  if (metrics.maxLossStreak >= 5) {
    patterns.push({
      id: 'streak-record-loss',
      type: 'insight',
      title: `Worst losing streak: ${metrics.maxLossStreak}`,
      description: `Longest losing streak of ${metrics.maxLossStreak} consecutive trades.`,
      priority: 8,
    });
  }

  return patterns;
}

function detectRiskPatterns(trades: Trade[], metrics: PeriodMetrics): DetectedPattern[] {
  if (metrics.tradeCount < MIN_TRADES_RISK) return [];
  const patterns: DetectedPattern[] = [];

  // Overtrading
  if (metrics.tradeFrequency > 3) {
    patterns.push({
      id: 'risk-overtrading',
      type: 'warning',
      title: 'Possible overtrading',
      description: `Averaging ${metrics.tradeFrequency.toFixed(1)} trades/day. Consider being more selective.`,
      priority: 2,
    });
  }

  // Average risk per trade
  const risksValid = trades.filter((t) => typeof t.risk_per_trade === 'number' && t.risk_per_trade > 0);
  if (risksValid.length >= MIN_TRADES_RISK) {
    const avgRisk = risksValid.reduce((sum, t) => sum + t.risk_per_trade, 0) / risksValid.length;
    if (avgRisk > 3) {
      patterns.push({
        id: 'risk-high',
        type: 'warning',
        title: 'High average risk',
        description: `Average risk per trade is ${avgRisk.toFixed(1)}%. Consider reducing to 1-2%.`,
        priority: 1,
      });
    }
  }

  // Average R:R on winning trades
  const winningTrades = trades.filter(
    (t) => !t.break_even && t.trade_outcome === 'Win' && typeof t.risk_reward_ratio === 'number' && t.risk_reward_ratio > 0,
  );
  if (winningTrades.length >= MIN_TRADES_DEFAULT) {
    const avgRR = winningTrades.reduce((sum, t) => sum + t.risk_reward_ratio, 0) / winningTrades.length;
    if (avgRR >= 2) {
      patterns.push({
        id: 'risk-good-rr',
        type: 'strength',
        title: `Strong R:R on wins`,
        description: `Average reward-to-risk on winning trades is ${avgRR.toFixed(2)}.`,
        priority: 6,
      });
    } else if (avgRR < 1) {
      patterns.push({
        id: 'risk-bad-rr',
        type: 'weakness',
        title: `Low R:R on wins`,
        description: `Average reward-to-risk on winning trades is only ${avgRR.toFixed(2)}. Aim for 1.5+.`,
        priority: 3,
      });
    }
  }

  return patterns;
}

function detectConfidencePatterns(trades: Trade[]): DetectedPattern[] {
  const withConfidence = trades.filter(
    (t) => typeof t.confidence_at_entry === 'number' && t.confidence_at_entry >= 1 && t.confidence_at_entry <= 5,
  );
  if (withConfidence.length < MIN_TRADES_PSYCHOLOGY) return [];

  const high = groupWinRate(withConfidence, (t) => t.confidence_at_entry! >= 4);
  const low = groupWinRate(withConfidence, (t) => t.confidence_at_entry! <= 2);
  if (high.count < 3 || low.count < 3) return [];

  const gap = high.winRate - low.winRate;
  if (Math.abs(gap) < 10) return [];

  if (gap > 0) {
    return [{
      id: 'confidence-correlation',
      type: 'insight',
      title: 'High confidence pays off',
      description: `High confidence trades (4-5) win at ${high.winRate.toFixed(1)}% vs ${low.winRate.toFixed(1)}% for low confidence (1-2).`,
      priority: 7,
    }];
  }

  return [{
    id: 'confidence-inverse',
    type: 'warning',
    title: 'Confidence not translating',
    description: `High confidence trades (4-5) win at only ${high.winRate.toFixed(1)}% vs ${low.winRate.toFixed(1)}% for low confidence.`,
    priority: 2,
  }];
}

function detectMindStatePatterns(trades: Trade[]): DetectedPattern[] {
  const withMindState = trades.filter(
    (t) => typeof t.mind_state_at_entry === 'number' && t.mind_state_at_entry >= 1 && t.mind_state_at_entry <= 5,
  );
  if (withMindState.length < MIN_TRADES_PSYCHOLOGY) return [];

  const good = groupWinRate(withMindState, (t) => t.mind_state_at_entry! >= 4);
  const bad = groupWinRate(withMindState, (t) => t.mind_state_at_entry! <= 2);
  if (good.count < 3 || bad.count < 3) return [];

  const gap = good.winRate - bad.winRate;
  if (Math.abs(gap) < 10) return [];

  if (gap > 0) {
    return [{
      id: 'mindstate-positive',
      type: 'insight',
      title: 'Good mindset = better results',
      description: `Trades taken in a good mind state (4-5) win at ${good.winRate.toFixed(1)}% vs ${bad.winRate.toFixed(1)}% when in a poor state.`,
      priority: 7,
    }];
  }

  return [{
    id: 'mindstate-inverse',
    type: 'warning',
    title: 'Mind state not matching results',
    description: `Trades in poor mind state (1-2) actually win at ${bad.winRate.toFixed(1)}% vs ${good.winRate.toFixed(1)}% for good state.`,
    priority: 2,
  }];
}

function detectNewsPatterns(trades: Trade[]): DetectedPattern[] {
  const newsStats = calculateNewsStats(trades);
  const news = newsStats.find((s) => s.news === 'News');
  const noNews = newsStats.find((s) => s.news === 'No News');
  if (!news || !noNews || news.total < MIN_TRADES_DEFAULT || noNews.total < MIN_TRADES_DEFAULT) return [];

  const gap = news.winRate - noNews.winRate;
  if (Math.abs(gap) < 10) return [];

  if (gap > 0) {
    return [{
      id: 'news-positive',
      type: 'strength',
      title: 'News trading edge',
      description: `News trades win at ${news.winRate.toFixed(1)}% vs ${noNews.winRate.toFixed(1)}% for non-news.`,
      priority: 6,
    }];
  }

  return [{
    id: 'news-negative',
    type: 'weakness',
    title: 'News trades underperform',
    description: `News trades win at only ${news.winRate.toFixed(1)}% vs ${noNews.winRate.toFixed(1)}% for non-news. Consider avoiding news events.`,
    priority: 4,
  }];
}

function detectPerformanceHealth(metrics: PeriodMetrics): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  if (metrics.tradeCount >= MIN_TRADES_RISK) {
    if (metrics.maxDrawdown > 10) {
      patterns.push({
        id: 'health-drawdown',
        type: 'warning',
        title: `Max drawdown: ${metrics.maxDrawdown.toFixed(1)}%`,
        description: 'Drawdown exceeds 10%. Risk management may need attention.',
        priority: 1,
      });
    }

    if (metrics.profitFactor >= 2) {
      patterns.push({
        id: 'health-pf-strong',
        type: 'strength',
        title: `Strong profit factor: ${metrics.profitFactor.toFixed(2)}`,
        description: 'Profit factor above 2 indicates a strong edge.',
        priority: 5,
      });
    } else if (metrics.profitFactor < 1) {
      patterns.push({
        id: 'health-pf-weak',
        type: 'weakness',
        title: 'Profit factor below 1',
        description: `Profit factor is ${metrics.profitFactor.toFixed(2)}. System is currently unprofitable.`,
        priority: 3,
      });
    }

    if (metrics.expectancy < 0) {
      patterns.push({
        id: 'health-expectancy',
        type: 'weakness',
        title: `Negative expectancy: $${metrics.expectancy.toFixed(0)}`,
        description: 'Average expected loss per trade. Review strategy or risk management.',
        priority: 4,
      });
    }

    if (metrics.consistencyScore >= 70) {
      patterns.push({
        id: 'health-consistency-high',
        type: 'strength',
        title: `High consistency: ${metrics.consistencyScore.toFixed(0)}%`,
        description: `${metrics.consistencyScore.toFixed(0)}% of trading days are profitable.`,
        priority: 6,
      });
    } else if (metrics.consistencyScore < 40) {
      patterns.push({
        id: 'health-consistency-low',
        type: 'weakness',
        title: `Low consistency: ${metrics.consistencyScore.toFixed(0)}%`,
        description: `Only ${metrics.consistencyScore.toFixed(0)}% of trading days are profitable.`,
        priority: 4,
      });
    }
  }

  return patterns;
}

function detectWinRateTrend(metrics: PeriodMetrics, priorMetrics: PeriodMetrics | null | undefined): DetectedPattern[] {
  if (!priorMetrics || metrics.tradeCount < MIN_TRADES_DEFAULT || priorMetrics.tradeCount < MIN_TRADES_DEFAULT) return [];

  const delta = metrics.winRate - priorMetrics.winRate;
  if (Math.abs(delta) < TREND_DELTA_PP) return [];

  if (delta > 0) {
    return [{
      id: 'trend-winrate-up',
      type: 'strength',
      title: 'Win rate improving',
      description: `Win rate up to ${metrics.winRate.toFixed(1)}% from ${priorMetrics.winRate.toFixed(1)}% (+${delta.toFixed(0)}pp).`,
      priority: 5,
    }];
  }

  return [{
    id: 'trend-winrate-down',
    type: 'warning',
    title: 'Win rate declining',
    description: `Win rate dropped to ${metrics.winRate.toFixed(1)}% from ${priorMetrics.winRate.toFixed(1)}% (${delta.toFixed(0)}pp).`,
    priority: 1,
  }];
}

function detectTimePatterns(trades: Trade[]): DetectedPattern[] {
  const withTime = trades.filter((t) => t.trade_time && t.trade_time.includes(':'));
  if (withTime.length < MIN_TRADES_TIME) return [];

  const intervalStats = calculateIntervalStats(withTime, TIME_INTERVALS);
  const valid = intervalStats.filter((s) => (s.wins + s.losses) >= 3);
  if (valid.length < 2) return [];

  const sorted = [...valid].sort((a, b) => b.winRate - a.winRate);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const patterns: DetectedPattern[] = [];

  if (best && best.winRate >= WIN_RATE_GOOD) {
    patterns.push({
      id: 'time-best',
      type: 'insight',
      title: `Best window: ${best.label}`,
      description: `${best.winRate.toFixed(1)}% win rate during ${best.label} (${best.wins + best.losses} trades).`,
      priority: 7,
    });
  }

  if (worst && worst.winRate <= WIN_RATE_BAD && worst.label !== best?.label) {
    patterns.push({
      id: 'time-worst',
      type: 'insight',
      title: `Weakest window: ${worst.label}`,
      description: `${worst.winRate.toFixed(1)}% win rate during ${worst.label} (${worst.wins + worst.losses} trades).`,
      priority: 8,
    });
  }

  return patterns;
}

// ─── Main function ──────────────────────────────────────────────────────────

export function detectTradingPatterns(
  trades: Trade[],
  metrics: PeriodMetrics,
  accountBalance: number,
  priorMetrics?: PeriodMetrics | null,
): DetectedPattern[] {
  try {
    if (trades.length === 0) return [];

    return [
      ...detectDirectionBias(metrics),
      ...detectMarketPatterns(trades, accountBalance),
      ...detectSessionPatterns(trades),
      ...detectSetupPatterns(trades),
      ...detectMssPatterns(trades),
      ...detectLiquidityPatterns(trades),
      ...detectDisplacementPatterns(trades),
      ...detectFvgSizePatterns(trades),
      ...detectDayPatterns(trades),
      ...detectStreakPatterns(metrics),
      ...detectRiskPatterns(trades, metrics),
      ...detectConfidencePatterns(trades),
      ...detectMindStatePatterns(trades),
      ...detectNewsPatterns(trades),
      ...detectPerformanceHealth(metrics),
      ...detectWinRateTrend(metrics, priorMetrics),
      ...detectTimePatterns(trades),
    ].sort((a, b) => a.priority - b.priority);
  } catch {
    return [];
  }
}

// ─── Multi-period trend detector ────────────────────────────────────────────

export function detectMultiPeriodTrends(
  metricsA: PeriodMetrics,
  metricsB: PeriodMetrics,
  metricsC: PeriodMetrics,
  labels: [string, string, string],
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const minTrades = MIN_TRADES_DEFAULT;

  if (metricsA.tradeCount < minTrades || metricsB.tradeCount < minTrades || metricsC.tradeCount < minTrades) {
    return [];
  }

  const checks: Array<{
    key: string;
    label: string;
    values: [number, number, number];
    format: (v: number) => string;
  }> = [
    { key: 'winrate', label: 'Win rate', values: [metricsA.winRate, metricsB.winRate, metricsC.winRate], format: (v) => `${v.toFixed(1)}%` },
    { key: 'pf', label: 'Profit factor', values: [metricsA.profitFactor, metricsB.profitFactor, metricsC.profitFactor], format: (v) => v.toFixed(2) },
    { key: 'consistency', label: 'Consistency', values: [metricsA.consistencyScore, metricsB.consistencyScore, metricsC.consistencyScore], format: (v) => `${v.toFixed(0)}%` },
  ];

  for (const check of checks) {
    const [a, b, c] = check.values;
    // A is shortest (most recent), C is longest
    // Improving: A > B > C (recent is better)
    // Declining: A < B < C (recent is worse)
    const improving = a > b + 2 && b > c + 2;
    const declining = a < b - 2 && b < c - 2;

    if (improving) {
      patterns.push({
        id: `trend-${check.key}-improving`,
        type: 'strength',
        title: `${check.label} consistently improving`,
        description: `${check.format(c)} (${labels[2]}) → ${check.format(b)} (${labels[1]}) → ${check.format(a)} (${labels[0]}).`,
        priority: 5,
      });
    } else if (declining) {
      patterns.push({
        id: `trend-${check.key}-declining`,
        type: 'warning',
        title: `${check.label} consistently declining`,
        description: `${check.format(c)} (${labels[2]}) → ${check.format(b)} (${labels[1]}) → ${check.format(a)} (${labels[0]}).`,
        priority: 1,
      });
    }
  }

  return patterns;
}

// ─── Merge helper for period-aware patterns ─────────────────────────────────

export function mergePatternsByPeriod(
  entries: Array<{ patterns: DetectedPattern[]; periodLabel: string }>,
): DetectedPattern[] {
  const map = new Map<string, DetectedPattern & { periods: string[] }>();

  for (const { patterns, periodLabel } of entries) {
    for (const p of patterns) {
      const existing = map.get(p.id);
      if (existing) {
        existing.periods.push(periodLabel);
        // Keep highest urgency (lowest priority number)
        if (p.priority < existing.priority) {
          existing.priority = p.priority;
        }
      } else {
        map.set(p.id, { ...p, periods: [periodLabel] });
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => a.priority - b.priority);
}
