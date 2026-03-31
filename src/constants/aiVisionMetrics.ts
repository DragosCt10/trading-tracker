// src/constants/aiVisionMetrics.ts
// Single source of truth for the 8 AI Vision health score metrics.
// Every chart, gauge, tooltip, and score calculation derives from this.

export interface AiVisionMetric {
  /** Key matching PeriodMetrics field */
  key: 'winRate' | 'netPnlPct' | 'profitFactor' | 'expectancy' | 'consistencyScore' | 'maxDrawdown' | 'recoveryFactor' | 'avgWinLossRatio' | 'tradeFrequency';
  /** Short label — used in charts */
  label: string;
  /** Full label — used in tooltips and tables */
  fullLabel: string;
  /** Normalization ceiling (raw value mapped to 100%) */
  max: number;
  /** When true, lower raw value = better (e.g. drawdown) */
  invert: boolean;
  /** Weight in composite health score — must all sum to 1.0 */
  weight: number;
}

export const AI_VISION_METRICS: AiVisionMetric[] = [
  { key: 'winRate',          label: 'Win Rate',    fullLabel: 'Win Rate',          max: 100,  invert: false, weight: 0.20 },
  { key: 'netPnlPct',        label: 'Net PnL %',   fullLabel: 'Net PnL %',         max: 10,   invert: false, weight: 0.15 },
  { key: 'profitFactor',     label: 'Profit F.',   fullLabel: 'Profit Factor',      max: 3,    invert: false, weight: 0.12 },
  { key: 'expectancy',       label: 'Expectancy',  fullLabel: 'Expectancy',         max: 1000, invert: false, weight: 0.12 },
  { key: 'consistencyScore', label: 'Consistency', fullLabel: 'Consistency Score',  max: 100,  invert: false, weight: 0.12 },
  { key: 'maxDrawdown',      label: 'Drawdown',    fullLabel: 'Max Drawdown',       max: 20,   invert: true,  weight: 0.10 },
  { key: 'recoveryFactor',   label: 'Recovery',    fullLabel: 'Recovery Factor',    max: 3,    invert: false, weight: 0.08 },
  { key: 'avgWinLossRatio',  label: 'W/L Ratio',   fullLabel: 'Avg Win/Loss Ratio', max: 3,    invert: false, weight: 0.08 },
  { key: 'tradeFrequency',   label: 'Frequency',   fullLabel: 'Trade Frequency',    max: 5,    invert: false, weight: 0.03 },
];
