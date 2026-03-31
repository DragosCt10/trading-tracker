// src/utils/calculateAiVisionScore.ts
import type { PeriodMetrics } from '@/utils/calculatePeriodMetrics';
import { AI_VISION_METRICS } from '@/constants/aiVisionMetrics';

/** Clamp a value between 0 and 1. */
function clamp01(v: number): number {
  if (!isFinite(v) || isNaN(v)) return 0;
  return Math.min(1, Math.max(0, v));
}

/**
 * Normalize a single metric value to [0, 1].
 * Expectancy is floored at 0 so negative values don't subtract from the score.
 */
function normalizeMetric(key: AiVisionMetric['key'], raw: number, max: number, invert: boolean): number {
  const value = (key === 'expectancy' || key === 'netPnlPct') ? Math.max(0, raw) : raw;
  const pct = clamp01(value / max);
  return invert ? 1 - pct : pct;
}

type AiVisionMetric = typeof AI_VISION_METRICS[number];

/**
 * Compute a composite AI Vision Score (0–100) from PeriodMetrics.
 * All weights and normalization caps come from AI_VISION_METRICS.
 */
export function calculateAiVisionScore(metrics: PeriodMetrics): number {
  if (metrics.tradeCount === 0) return 0;

  const raw = AI_VISION_METRICS.reduce((sum, { key, max, invert, weight }) => {
    const value = metrics[key] as number;
    return sum + normalizeMetric(key, value, max, invert) * weight;
  }, 0);

  return Math.round(clamp01(raw) * 100);
}
