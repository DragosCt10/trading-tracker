'use client';

import { useMemo, type ReactNode, memo } from 'react';
import type { Trade } from '@/types/trade';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { StrategySectionKey as FullWidthSectionKey } from '@/hooks/useStrategySectionVisibility';
import { MONTHS } from '@/utils/accountOverviewHelpers';
import { chartOptions } from '@/utils/chartConfig';
import { MonthlyPerformanceChart, computeFullMonthlyStatsFromTrades } from '@/components/dashboard/analytics/MonthlyPerformanceChart';
import { MarketStatisticsCard, type MarketStatisticsCardProps } from '@/components/dashboard/analytics/MarketStatisticsCard';
import MarketProfitStatisticsCard from '@/components/dashboard/analytics/MarketProfitStats';
import { TimeIntervalStatisticsCard } from '@/components/dashboard/analytics/TimeIntervalStatisticsCard';
import { DayStatisticsCard, type DayStatisticsCardProps } from '@/components/dashboard/analytics/DayStatisticsCard';
import { NewsNameChartCard } from '@/components/dashboard/analytics/NewsNameChartCard';
import { RiskRewardStats } from '@/components/dashboard/analytics/RiskRewardStats';
import { SLSizeStatisticsCard } from '@/components/dashboard/analytics/SLSizeStatisticsCard';
import { SetupStatisticsCard } from '@/components/dashboard/analytics/SetupStatisticsCard';
import { LiquidityStatisticsCard } from '@/components/dashboard/analytics/LiquidityStatisticsCard';
import type { TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';

type StrategyAdditionalAnalyticsSectionsProps = {
  isPro: boolean;
  showProContent: boolean;
  renderSectionCollapseButton: (key: FullWidthSectionKey) => ReactNode;
  isSectionExpanded: (key: FullWidthSectionKey) => boolean;
  filteredChartStats: unknown;
  statsToUseForCharts: {
    marketStats: MarketStatisticsCardProps['marketStats'];
    dayStats: DayStatisticsCardProps['dayStats'];
    slSizeStats: Parameters<typeof SLSizeStatisticsCard>[0]['slSizeStats'];
    setupStats: Parameters<typeof SetupStatisticsCard>[0]['setupStats'];
    liquidityStats: Parameters<typeof LiquidityStatisticsCard>[0]['liquidityStats'];
  };
  marketStatsToUse: MarketStatisticsCardProps['marketStats'];
  chartsLoadingState: boolean;
  tradesToUse: Trade[];
  viewMode: 'yearly' | 'dateRange';
  filteredMarketStats: unknown;
  marketAllTradesStats: unknown;
  marketStats: unknown;
  getCurrencySymbol: () => string;
  timeIntervalChartDataToUse: TradeStatDatum[];
  dayStats: DayStatisticsCardProps['dayStats'];
  hasCard: (key: ExtraCardKey) => boolean;
  selectedHalfWidthCards: { key: ExtraCardKey; element: ReactNode }[];
};

function StrategyAdditionalAnalyticsSectionsBase({
  isPro,
  showProContent,
  renderSectionCollapseButton,
  isSectionExpanded,
  filteredChartStats,
  statsToUseForCharts,
  marketStatsToUse,
  chartsLoadingState,
  tradesToUse,
  viewMode,
  filteredMarketStats,
  marketAllTradesStats,
  marketStats,
  getCurrencySymbol,
  timeIntervalChartDataToUse,
  dayStats,
  hasCard,
  selectedHalfWidthCards,
}: StrategyAdditionalAnalyticsSectionsProps) {
  // Compute monthly performance stats only when the chart is visible.
  // Moved here from StrategyClient to avoid O(n) trade iteration on every filter
  // change when the section is collapsed. bodyVisible mirrors the chart's bodyVisible prop.
  const isMonthlyChartVisible = !isPro || isSectionExpanded('monthlyPerformanceChart');
  const monthlyPerformanceStatsToUse = useMemo(
    () => isMonthlyChartVisible ? computeFullMonthlyStatsFromTrades(tradesToUse) : {},
    [tradesToUse, isMonthlyChartVisible]
  );

  return (
    <>
      <div className="my-8 mt-12">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
          Trade Performance Analysis
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          See your trading performance metrics and statistics.
        </p>
      </div>

      <div className="w-full mb-8">
        <MonthlyPerformanceChart
          monthlyStatsAllTrades={monthlyPerformanceStatsToUse}
          months={MONTHS}
          chartOptions={chartOptions}
          headerAction={isPro ? renderSectionCollapseButton('monthlyPerformanceChart') : undefined}
          bodyVisible={!isPro || isSectionExpanded('monthlyPerformanceChart')}
        />
      </div>

      {showProContent && (
        <>
          <div className="my-8">
            <MarketStatisticsCard
              marketStats={
                filteredChartStats
                  ? statsToUseForCharts.marketStats
                  : marketStatsToUse
              }
              isLoading={chartsLoadingState}
              includeTotalTrades={filteredChartStats !== null}
              isPro={isPro}
              headerAction={isPro ? renderSectionCollapseButton('marketStats') : undefined}
              bodyVisible={!isPro || isSectionExpanded('marketStats')}
            />
          </div>

          <div className="my-8">
            <MarketProfitStatisticsCard
              trades={tradesToUse}
              marketStats={
                viewMode === 'yearly'
                  ? (filteredMarketStats || marketAllTradesStats) as any
                  : (filteredMarketStats || marketStats) as any
              }
              chartOptions={chartOptions}
              getCurrencySymbol={getCurrencySymbol}
              isPro={isPro}
              headerAction={isPro ? renderSectionCollapseButton('marketProfitStats') : undefined}
              bodyVisible={!isPro || isSectionExpanded('marketProfitStats')}
            />
          </div>
        </>
      )}

      <hr className="col-span-full my-10 border-t border-slate-200 dark:border-slate-700" />

      {showProContent && (
        <div className="my-8">
          <TimeIntervalStatisticsCard
            data={timeIntervalChartDataToUse}
            isLoading={chartsLoadingState}
            isPro={isPro}
            headerAction={isPro ? renderSectionCollapseButton('timeIntervalStats') : undefined}
            bodyVisible={!isPro || isSectionExpanded('timeIntervalStats')}
          />
        </div>
      )}

      <div className="my-8">
        <DayStatisticsCard
          dayStats={filteredChartStats ? statsToUseForCharts.dayStats : dayStats}
          isLoading={chartsLoadingState}
          includeTotalTrades={filteredChartStats !== null}
          headerAction={isPro ? renderSectionCollapseButton('dayStats') : undefined}
          bodyVisible={!isPro || isSectionExpanded('dayStats')}
        />
      </div>
      {showProContent && (
        <div className="my-8">
          <NewsNameChartCard
            trades={tradesToUse}
            isLoading={chartsLoadingState}
            isPro={isPro}
            headerAction={isPro ? renderSectionCollapseButton('newsByEvent') : undefined}
            bodyVisible={!isPro || isSectionExpanded('newsByEvent')}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 w-full [&>*]:min-w-0">
        {showProContent && hasCard('potential_rr') && (
          <RiskRewardStats
            trades={tradesToUse}
            isLoading={chartsLoadingState}
          />
        )}
        {hasCard('sl_size_stats') && (
          <SLSizeStatisticsCard
            slSizeStats={statsToUseForCharts.slSizeStats}
            isLoading={chartsLoadingState}
          />
        )}
      </div>

      {hasCard('setup_stats') && (
        <div className="my-8">
          <SetupStatisticsCard
            setupStats={statsToUseForCharts.setupStats}
            isLoading={chartsLoadingState}
            includeTotalTrades={filteredChartStats !== null}
            headerAction={isPro ? renderSectionCollapseButton('setupStats') : undefined}
            bodyVisible={!isPro || isSectionExpanded('setupStats')}
          />
        </div>
      )}

      {hasCard('liquidity_stats') && (
        <div className="my-8">
          <LiquidityStatisticsCard
            liquidityStats={statsToUseForCharts.liquidityStats}
            isLoading={chartsLoadingState}
            includeTotalTrades={filteredChartStats !== null}
            headerAction={isPro ? renderSectionCollapseButton('liquidityStats') : undefined}
            bodyVisible={!isPro || isSectionExpanded('liquidityStats')}
          />
        </div>
      )}

      {selectedHalfWidthCards.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-8 w-full [&>*]:min-w-0">
          {selectedHalfWidthCards.map(({ key, element }) => (
            <div key={key}>{element}</div>
          ))}
        </div>
      )}
    </>
  );
}

export const StrategyAdditionalAnalyticsSections = memo(StrategyAdditionalAnalyticsSectionsBase);
