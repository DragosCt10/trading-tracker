'use client';

import { type ReactNode, memo } from 'react';
import type { Trade } from '@/types/trade';
import type { StrategySectionKey as FullWidthSectionKey } from '@/hooks/useStrategySectionVisibility';
import { TradingOverviewStats } from '@/components/dashboard/analytics/TradingOverviewStats';
import { ConfidenceStatsCard, MindStateStatsCard } from '@/components/dashboard/analytics/ConfidenceMindStateCards';
import { EquityCurveCard } from '@/components/dashboard/analytics/EquityCurveCard';
import { ConsistencyScoreChart } from '@/components/dashboard/analytics/ConsistencyScoreChart';
import { AverageDrawdownChart } from '@/components/dashboard/analytics/AverageDrawdownChart';
import { MaxDrawdownChart } from '@/components/dashboard/analytics/MaxDrawdownChart';
import { ProfitFactorChart } from '@/components/dashboard/analytics/ProfitFactorChart';
import { SharpeRatioChart } from '@/components/dashboard/analytics/SharpeRatioChart';
import { TQIChart } from '@/components/dashboard/analytics/TQIChart';
import { RecoveryFactorChart } from '@/components/dashboard/analytics/RecoveryFactorChart';
import { DrawdownCountChart } from '@/components/dashboard/analytics/DrawdownCountChart';
import { SectionHeading } from './SectionHeading';

type TradingOverviewStatsProps = Parameters<typeof TradingOverviewStats>[0];

type StrategyCoreStatisticsSectionProps = {
  renderSectionCollapseButton: (key: FullWidthSectionKey) => ReactNode;
  isSectionExpanded: (key: FullWidthSectionKey) => boolean;
  tradingOverviewProps: TradingOverviewStatsProps;
};

function StrategyCoreStatisticsSectionBase({
  renderSectionCollapseButton,
  isSectionExpanded,
  tradingOverviewProps,
}: StrategyCoreStatisticsSectionProps) {
  return (
    <>
      <SectionHeading
        title="Core statistics"
        description="Trading statistics and performance metrics."
        action={renderSectionCollapseButton('coreStatistics')}
      />

      {isSectionExpanded('coreStatistics') && (
        <div className="flex flex-col md:grid md:grid-cols-4 gap-6 w-full">
          <TradingOverviewStats {...tradingOverviewProps} />
        </div>
      )}
    </>
  );
}

export const StrategyCoreStatisticsSection = memo(StrategyCoreStatisticsSectionBase);

type StrategyPerformanceSectionsProps = {
  renderSectionCollapseButton: (key: FullWidthSectionKey) => ReactNode;
  isSectionExpanded: (key: FullWidthSectionKey) => boolean;
  showProContent: boolean;
  isPro: boolean;
  tradesToUse: Trade[];
  chartsLoadingState: boolean;
  currencySymbol: string;
  consistencyScore: number;
  averageDrawdown: number;
  maxDrawdown: number | null;
  totalWins: number;
  totalLosses: number;
  sharpeWithBE: number;
  recoveryFactor: number;
  drawdownCount: number;
};

function StrategyPerformanceSectionsBase({
  renderSectionCollapseButton,
  isSectionExpanded,
  showProContent,
  isPro,
  tradesToUse,
  chartsLoadingState,
  currencySymbol,
  consistencyScore,
  averageDrawdown,
  maxDrawdown,
  totalWins,
  totalLosses,
  sharpeWithBE,
  recoveryFactor,
  drawdownCount,
}: StrategyPerformanceSectionsProps) {
  return (
    <>
      {showProContent && (
        <>
          <SectionHeading
            title="Psychological Factors"
            description="Confidence and mind state at entry across your trades."
            descriptionClassName="mt-1"
            action={renderSectionCollapseButton('psychologicalFactors')}
          />
          {isSectionExpanded('psychologicalFactors') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-6">
              <ConfidenceStatsCard trades={tradesToUse} isLoading={chartsLoadingState} isPro={isPro} />
              <MindStateStatsCard trades={tradesToUse} isLoading={chartsLoadingState} isPro={isPro} />
            </div>
          )}
        </>
      )}

      <SectionHeading
        title="Equity Curve"
        description="Cumulative P&L over time."
        action={renderSectionCollapseButton('equityCurve')}
      />
      {isSectionExpanded('equityCurve') && (
        <div className="w-full mb-6">
          <EquityCurveCard trades={tradesToUse} currencySymbol={currencySymbol} />
        </div>
      )}

      {showProContent && (
        <>
          <SectionHeading
            title="Consistency & drawdown"
            description="Consistency and capital preservation metrics."
            action={renderSectionCollapseButton('consistencyDrawdown')}
          />
          {isSectionExpanded('consistencyDrawdown') && (
            <div className="flex flex-col md:grid md:grid-cols-3 gap-6 w-full">
              <ConsistencyScoreChart consistencyScore={consistencyScore} isPro={isPro} />
              <AverageDrawdownChart averageDrawdown={averageDrawdown} isPro={isPro} />
              <MaxDrawdownChart maxDrawdown={maxDrawdown} isPro={isPro} />
            </div>
          )}

          <SectionHeading
            title="Performance ratios"
            description="Return and risk-adjusted metrics."
            action={renderSectionCollapseButton('performanceRatios')}
          />
          {isSectionExpanded('performanceRatios') && (
            <>
              <div className="flex flex-col md:grid md:grid-cols-3 gap-6 w-full">
                <ProfitFactorChart tradesToUse={tradesToUse} totalWins={totalWins} totalLosses={totalLosses} isPro={isPro} />
                <SharpeRatioChart sharpeRatio={sharpeWithBE} isPro={isPro} />
                <TQIChart tradesToUse={tradesToUse} isPro={isPro} />
              </div>
              <div className="flex flex-col md:grid md:grid-cols-2 gap-6 w-full mt-6">
                <RecoveryFactorChart recoveryFactor={recoveryFactor} isPro={isPro} />
                <DrawdownCountChart drawdownCount={drawdownCount} isPro={isPro} />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

export const StrategyPerformanceSections = memo(StrategyPerformanceSectionsBase);
