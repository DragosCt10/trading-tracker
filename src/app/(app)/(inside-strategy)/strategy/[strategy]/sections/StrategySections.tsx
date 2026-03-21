'use client';

import { type ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Trade } from '@/types/trade';
import type { ExtraCardKey } from '@/constants/extraCards';
import { MONTHS } from '@/utils/accountOverviewHelpers';
import type { DateRangeState } from '@/utils/dateRangeHelpers';
import { chartOptions } from '@/utils/chartConfig';
import type { StrategySectionKey as FullWidthSectionKey } from '@/hooks/useStrategySectionVisibility';
import { YearSelector } from '@/components/dashboard/analytics/YearSelector';
import { AccountOverviewCard } from '@/components/dashboard/analytics/AccountOverviewCard';
import { MonthPerformanceCards } from '@/components/dashboard/analytics/MonthPerformanceCard';
import {
  TradesCalendarCard,
  getDaysInMonthForDate,
  buildWeeklyStats,
} from '@/components/dashboard/analytics/TradesCalendarCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import { TradingOverviewStats } from '@/components/dashboard/analytics/TradingOverviewStats';
import { MonthlyPerformanceChart, computeFullMonthlyStatsFromTrades } from '@/components/dashboard/analytics/MonthlyPerformanceChart';
import { MarketStatisticsCard, type MarketStatisticsCardProps } from '@/components/dashboard/analytics/MarketStatisticsCard';
import MarketProfitStatisticsCard from '@/components/dashboard/analytics/MarketProfitStats';
import { TimeIntervalStatisticsCard } from '@/components/dashboard/analytics/TimeIntervalStatisticsCard';
import { DayStatisticsCard, type DayStatisticsCardProps } from '@/components/dashboard/analytics/DayStatisticsCard';
import { NewsNameChartCard } from '@/components/dashboard/analytics/NewsNameChartCard';
import { RiskRewardStats } from '@/components/dashboard/analytics/RiskRewardStats';
import { SLSizeStatisticsCard } from '@/components/dashboard/analytics/SLSizeStatisticsCard';
import {
  SetupStatisticsCard,
} from '@/components/dashboard/analytics/SetupStatisticsCard';
import {
  LiquidityStatisticsCard,
} from '@/components/dashboard/analytics/LiquidityStatisticsCard';
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
import type { TradeStatDatum } from '@/components/dashboard/analytics/TradesStatsBarCard';

export type ExecutionFilter = 'all' | 'executed' | 'nonExecuted';

type SectionHeadingProps = {
  title: string;
  description: string;
  action?: ReactNode;
  containerClassName?: string;
  descriptionClassName?: string;
};

function SectionHeading({
  title,
  description,
  action,
  containerClassName,
  descriptionClassName,
}: SectionHeadingProps) {
  return (
    <>
      <div className={cn('flex items-center justify-between mt-14 mb-2', containerClassName)}>
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h2>
        {action ?? null}
      </div>
      <p className={cn('text-slate-500 dark:text-slate-400 mb-6', descriptionClassName)}>
        {description}
      </p>
    </>
  );
}

type StrategyOverviewAndCalendarSectionsProps = {
  viewMode: 'yearly' | 'dateRange';
  selectedYear: number;
  onSelectedYearChange: (year: number) => void;
  renderSectionCollapseButton: (key: FullWidthSectionKey) => ReactNode;
  isSectionExpanded: (key: FullWidthSectionKey) => boolean;
  initialStrategyName?: string | null;
  currencySymbol: string;
  updatedBalance: number;
  totalYearProfit: number;
  activeAccountBalance?: number | null;
  monthlyStatsToUse: Record<string, { profit: number }>;
  accountOverviewLoadingState: boolean;
  isLoadingStats: boolean;
  statsTotalTrades?: number;
  tradesToUse: Trade[];
  resolvedAccountBalance?: number | null;
  dateRange: DateRangeState;
  selectedMarket: string;
  selectedExecution: ExecutionFilter;
  currentDate: Date;
  handleMonthNavigation: (direction: 'prev' | 'next') => void;
  canNavigateMonth: (direction: 'prev' | 'next') => boolean;
  weeklyStats: ReturnType<typeof buildWeeklyStats>;
  calendarMonthTradesToUse: Trade[];
  selectionActiveAccountBalance?: number | null;
  getDaysInMonth: ReturnType<typeof getDaysInMonthForDate>;
};

export function StrategyOverviewAndCalendarSections({
  viewMode,
  selectedYear,
  onSelectedYearChange,
  renderSectionCollapseButton,
  isSectionExpanded,
  initialStrategyName,
  currencySymbol,
  updatedBalance,
  totalYearProfit,
  activeAccountBalance,
  monthlyStatsToUse,
  accountOverviewLoadingState,
  isLoadingStats,
  statsTotalTrades,
  tradesToUse,
  resolvedAccountBalance,
  dateRange,
  selectedMarket,
  selectedExecution,
  currentDate,
  handleMonthNavigation,
  canNavigateMonth,
  weeklyStats,
  calendarMonthTradesToUse,
  selectionActiveAccountBalance,
  getDaysInMonth,
}: StrategyOverviewAndCalendarSectionsProps) {
  const [calendarTradeDetails, setCalendarTradeDetails] = useState<Trade | null>(null);

  return (
    <>
      <SectionHeading
        title="Overview & Monthly highlights"
        description="Account balance, yearly P&L, and best and worst month for the selected period."
        containerClassName="mt-8"
        action={(
          <div className="flex items-center gap-3">
            {viewMode === 'yearly' && (
              <YearSelector
                selectedYear={selectedYear}
                onYearChange={onSelectedYearChange}
              />
            )}
            {renderSectionCollapseButton('overview')}
          </div>
        )}
      />

      {isSectionExpanded('overview') && (
        <>
          <AccountOverviewCard
            accountName={initialStrategyName ?? null}
            currencySymbol={currencySymbol}
            updatedBalance={updatedBalance}
            totalYearProfit={totalYearProfit}
            accountBalance={activeAccountBalance || 1}
            months={MONTHS}
            monthlyStatsAllTrades={monthlyStatsToUse}
            isYearDataLoading={accountOverviewLoadingState}
            isFetching={isLoadingStats}
            tradesCount={statsTotalTrades ?? tradesToUse.length}
          />

          {viewMode === 'yearly' && (
            <MonthPerformanceCards
              trades={tradesToUse}
              selectedYear={selectedYear}
              currencySymbol={currencySymbol}
              accountBalance={resolvedAccountBalance}
              isLoading={accountOverviewLoadingState}
            />
          )}
        </>
      )}

      <SectionHeading
        title="Trades Calendar"
        description="See your trades and activity by calendar day and week."
        action={renderSectionCollapseButton('calendar')}
      />
      {isSectionExpanded('calendar') && (
        <>
          <TradesCalendarCard
            key={`${viewMode}-${dateRange.startDate}-${dateRange.endDate}-${selectedMarket}-${selectedExecution}`}
            currentDate={currentDate}
            onMonthNavigate={handleMonthNavigation}
            canNavigateMonth={canNavigateMonth}
            weeklyStats={weeklyStats}
            calendarMonthTrades={calendarMonthTradesToUse}
            selectedMarket={selectedMarket}
            currencySymbol={currencySymbol}
            accountBalance={selectionActiveAccountBalance}
            getDaysInMonth={() => getDaysInMonth}
            onTradeClick={setCalendarTradeDetails}
          />
          <TradeDetailsModal
            trade={calendarTradeDetails}
            isOpen={!!calendarTradeDetails}
            onClose={() => setCalendarTradeDetails(null)}
          />
        </>
      )}
    </>
  );
}

type TradingOverviewStatsProps = Parameters<typeof TradingOverviewStats>[0];

type StrategyCoreStatisticsSectionProps = {
  renderSectionCollapseButton: (key: FullWidthSectionKey) => ReactNode;
  isSectionExpanded: (key: FullWidthSectionKey) => boolean;
  tradingOverviewProps: TradingOverviewStatsProps;
};

export function StrategyCoreStatisticsSection({
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

export function StrategyPerformanceSections({
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

type StrategyAdditionalAnalyticsSectionsProps = {
  isPro: boolean;
  showProContent: boolean;
  renderSectionCollapseButton: (key: FullWidthSectionKey) => ReactNode;
  isSectionExpanded: (key: FullWidthSectionKey) => boolean;
  monthlyPerformanceStatsToUse: ReturnType<typeof computeFullMonthlyStatsFromTrades>;
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

export function StrategyAdditionalAnalyticsSections({
  isPro,
  showProContent,
  renderSectionCollapseButton,
  isSectionExpanded,
  monthlyPerformanceStatsToUse,
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
