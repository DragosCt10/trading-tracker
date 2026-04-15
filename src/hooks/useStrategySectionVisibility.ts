'use client';

import { useCallback, useState } from 'react';

type FullWidthSectionKey =
  | 'overview'
  | 'calendar'
  | 'coreStatistics'
  | 'psychologicalFactors'
  | 'equityCurve'
  | 'consistencyDrawdown'
  | 'performanceRatios'
  | 'monthlyPerformanceChart'
  | 'marketStats'
  | 'marketProfitStats'
  | 'timeIntervalStats'
  | 'dayStats'
  | 'newsByEvent'
  | 'setupStats'
  | 'liquidityStats';

export type StrategySectionKey = FullWidthSectionKey;

const DEFAULT_SECTION_EXPANDED: Record<FullWidthSectionKey, boolean> = {
  overview: true,
  calendar: true,
  coreStatistics: true,
  psychologicalFactors: true,
  equityCurve: true,
  consistencyDrawdown: true,
  performanceRatios: true,
  monthlyPerformanceChart: true,
  marketStats: true,
  marketProfitStats: true,
  timeIntervalStats: true,
  dayStats: true,
  newsByEvent: true,
  setupStats: true,
  liquidityStats: true,
};

/**
 * Section visibility hook.
 *
 * - `showProContent` gates Pro-only Core Statistics content (Psychological Factors,
 *   Consistency & Drawdown, Performance Ratios) — these remain Pro-tier exclusive.
 * - `showExtendedContent` gates Trade Performance Analysis sections (Market Stats,
 *   Market Profit, Time Interval, News) and the 5 PRO_ONLY Extra Trade Performance
 *   Cards. Starter Plus unlocks these via `hasExtendedAnalytics = true`.
 *
 * Both preview via the `showProCards` toggle when the user is not on the real tier.
 */
export function useStrategySectionVisibility(isPro: boolean, hasExtendedAnalytics: boolean = isPro) {
  const [showProCards, setShowProCards] = useState(true);
  const [expandedSections, setExpandedSections] =
    useState<Record<FullWidthSectionKey, boolean>>(() => DEFAULT_SECTION_EXPANDED);

  const showProContent = isPro || showProCards;
  const showExtendedContent = hasExtendedAnalytics || showProCards;
  const toggleSection = useCallback((key: FullWidthSectionKey) => {
    setExpandedSections((current) => ({ ...current, [key]: !current[key] }));
  }, []);
  const isSectionExpanded = useCallback(
    (key: FullWidthSectionKey) => !isPro || expandedSections[key],
    [expandedSections, isPro]
  );

  return {
    showProCards,
    setShowProCards,
    showProContent,
    showExtendedContent,
    toggleSection,
    isSectionExpanded,
  };
}
