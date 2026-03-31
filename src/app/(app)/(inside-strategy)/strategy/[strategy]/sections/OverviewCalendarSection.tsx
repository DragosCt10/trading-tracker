'use client';

import { type ReactNode, useState } from 'react';
import type { Trade } from '@/types/trade';
import type { DateRangeState } from '@/utils/dateRangeHelpers';
import type { StrategySectionKey as FullWidthSectionKey } from '@/hooks/useStrategySectionVisibility';
import { MONTHS } from '@/utils/accountOverviewHelpers';
import { YearSelector } from '@/components/dashboard/analytics/YearSelector';
import { AccountOverviewCard } from '@/components/dashboard/analytics/AccountOverviewCard';
import { MonthPerformanceCards } from '@/components/dashboard/analytics/MonthPerformanceCard';
import {
  TradesCalendarCard,
  getDaysInMonthForDate,
  buildWeeklyStats,
} from '@/components/dashboard/analytics/TradesCalendarCard';
import TradeDetailsModal from '@/components/TradeDetailsModal';
import { SectionHeading } from './SectionHeading';
import { SavedTag } from '@/types/saved-tag';

export type ExecutionFilter = 'all' | 'executed' | 'nonExecuted';

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
  /** Strategy's saved tag vocabulary for autocomplete in trade details. */
  savedTags?: SavedTag[];
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
  savedTags,
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
            savedTags={savedTags}
          />
        </>
      )}
    </>
  );
}
