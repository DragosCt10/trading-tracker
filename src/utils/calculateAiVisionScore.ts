// src/utils/calculateAiVisionScore.ts
import type { PeriodMetrics } from '@/utils/calculatePeriodMetrics';

/**
 * Weights for the AI Vision composite score (0–100).
 * Sum = 1.0. Tune here without touching any UI component.
 */
export const SCORE_WEIGHTS = {
  winRate:          0.20, // normalize: 0–100%
  profitFactor:     0.15, // normalize: 0–3 (cap at 3)
  expectancy:       0.15, // normalize via absolute value, cap at ±1000
  consistencyScore: 0.15, // normalize: 0–100%
  maxDrawdown:      0.10, // inverted: lower is better, normalize 0–20%
  recoveryFactor:   0.10, // normalize: 0–3 (cap at 3)
  avgWinLossRatio:  0.10, // normalize: 0–3 (cap at 3)
  tradeFrequency:   0.05, // normalize: 0–5 trades/day
} as const;

/** Clamp a value between 0 and 1. */
function clamp01(v: number): number {
  if (!isFinite(v) || isNaN(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/**
 * Compute a composite AI Vision Score (0–100) from PeriodMetrics.
 * All inputs are normalized and weighted. Returns 0 when all metrics are 0.
 */
export function calculateAiVisionScore(metrics: PeriodMetrics): number {
  if (metrics.tradeCount === 0) return 0;

  const normalized = {
    winRate:          clamp01(metrics.winRate / 100),
    profitFactor:     clamp01(metrics.profitFactor / 3),
    // Expectancy: positive = good. Cap benefit at 1000, penalty floored at 0.
    expectancy:       clamp01(Math.max(0, metrics.expectancy) / 1000),
    consistencyScore: clamp01(metrics.consistencyScore / 100),
    // Max drawdown is inverted: 0% drawdown → 1.0, 20%+ drawdown → 0.0
    maxDrawdown:      clamp01(1 - metrics.maxDrawdown / 20),
    recoveryFactor:   clamp01(metrics.recoveryFactor / 3),
    avgWinLossRatio:  clamp01(metrics.avgWinLossRatio / 3),
    tradeFrequency:   clamp01(metrics.tradeFrequency / 5),
  };

  const raw =
    normalized.winRate          * SCORE_WEIGHTS.winRate +
    normalized.profitFactor     * SCORE_WEIGHTS.profitFactor +
    normalized.expectancy       * SCORE_WEIGHTS.expectancy +
    normalized.consistencyScore * SCORE_WEIGHTS.consistencyScore +
    normalized.maxDrawdown      * SCORE_WEIGHTS.maxDrawdown +
    normalized.recoveryFactor   * SCORE_WEIGHTS.recoveryFactor +
    normalized.avgWinLossRatio  * SCORE_WEIGHTS.avgWinLossRatio +
    normalized.tradeFrequency   * SCORE_WEIGHTS.tradeFrequency;

  return Math.round(clamp01(raw) * 100);
}
