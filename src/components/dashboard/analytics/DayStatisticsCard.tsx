'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { Trade } from '@/types/trade';
import { calculateDayStats as calculateDayStatsUtil } from '@/utils/calculateCategoryStats';
import type { DayStats, BaseStats } from '@/types/dashboard';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useBECalc } from '@/contexts/BECalcContext';
import { ComposedBarWinRateChart, type BarWinRateChartDatum } from './ComposedBarWinRateChart';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Map short or alternate day names to canonical full name for chart order */
const DAY_NORMALIZE: Record<string, string> = {
  Mon: 'Monday', Monday: 'Monday',
  Tue: 'Tuesday', Tues: 'Tuesday', Tuesday: 'Tuesday',
  Wed: 'Wednesday', Wednesday: 'Wednesday',
  Thu: 'Thursday', Thurs: 'Thursday', Thursday: 'Thursday',
  Fri: 'Friday', Friday: 'Friday',
  Sat: 'Saturday', Saturday: 'Saturday',
  Sun: 'Sunday', Sunday: 'Sunday',
};

/** Short display labels for X-axis (aligned with NewTradeModal/TradeDetailsModal DAY_OF_WEEK_OPTIONS). Other-language days from import are shown as-is, truncated to MAX_DAY_LABEL_LENGTH. */
const DAY_DISPLAY_LABELS: Record<string, string> = {
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
  Sunday: 'Sun',
};

const MAX_DAY_LABEL_LENGTH = 10;

function normalizeDay(day: string): string {
  return DAY_NORMALIZE[day] ?? day;
}

/** Case-insensitive lookup for known English days; other-language day names (e.g. from import) are returned as-is, truncated to MAX_DAY_LABEL_LENGTH. */
function getDayDisplayLabel(day: string): string {
  if (!day || day.trim() === '') return 'Unknown';
  const trimmed = day.trim();
  const exact = DAY_DISPLAY_LABELS[trimmed];
  if (exact !== undefined) return exact.length > MAX_DAY_LABEL_LENGTH ? exact.slice(0, MAX_DAY_LABEL_LENGTH) : exact;
  const lower = trimmed.toLowerCase();
  const entry = Object.entries(DAY_DISPLAY_LABELS).find(([k]) => k.toLowerCase() === lower);
  if (entry) {
    const label = entry[1];
    return label.length > MAX_DAY_LABEL_LENGTH ? label.slice(0, MAX_DAY_LABEL_LENGTH) : label;
  }
  return trimmed.length > MAX_DAY_LABEL_LENGTH ? trimmed.slice(0, MAX_DAY_LABEL_LENGTH) : trimmed;
}

// Type that matches both DayStats and filtered stats (which may not have day property)
type DayStatsLike = BaseStats & {
  day?: string;
  total?: number;
};

export interface DayStatisticsCardProps {
  dayStats: DayStatsLike[];
  isLoading?: boolean;
  /** If true, includes totalTrades in chart data (for filtered stats) */
  includeTotalTrades?: boolean;
}

export function calculateDayStats(trades: Trade[]): DayStats[] {
  return calculateDayStatsUtil(trades);
}

/**
 * Convert day stats to chart data format (for bar card; kept for compatibility)
 */
export function convertDayStatsToChartData(
  dayStats: DayStatsLike[],
  _includeTotalTrades: boolean = false
): { category: string; wins: number; losses: number; breakEven: number; winRate: number; winRateWithBE: number; totalTrades?: number }[] {
  return dayStats.map((stat) => {
    const totalTrades = (stat.wins ?? 0) + (stat.losses ?? 0) + (stat.breakEven ?? 0);
    return {
      category: `${stat.day}`,
      wins: stat.wins ?? 0,
      losses: stat.losses ?? 0,
      breakEven: stat.breakEven ?? 0,
      winRate: stat.winRate ?? 0,
      winRateWithBE: stat.winRateWithBE ?? 0,
      totalTrades,
    };
  });
}

/**
 * Convert filtered day stats to chart data format (includes totalTrades)
 */
export function convertFilteredDayStatsToChartData(dayStats: DayStatsLike[]) {
  return convertDayStatsToChartData(dayStats, true);
}

export const DayStatisticsCard: React.FC<DayStatisticsCardProps> = React.memo(
  function DayStatisticsCard({ dayStats, isLoading: externalLoading, includeTotalTrades = false }) {
    const { mounted, isDark } = useDarkMode();
    const { beCalcEnabled } = useBECalc();
    const [isLoading, setIsLoading] = useState(true);


    useEffect(() => {
      if (mounted) {
        if (externalLoading) {
          const timer = setTimeout(() => setIsLoading(true), 0);
          return () => clearTimeout(timer);
        } else {
          const timer = setTimeout(() => setIsLoading(false), 600);
          return () => clearTimeout(timer);
        }
      }
    }, [mounted, externalLoading]);

    const statsByDay: Record<string, { wins: number; losses: number; breakEven: number; winRate: number; winRateWithBE: number }> = {};
    dayStats.forEach((stat) => {
      const rawDay = stat.day ?? 'Unknown';
      const day = normalizeDay(rawDay);
      const existing = statsByDay[day];
      const wins = (stat.wins ?? 0) + (existing?.wins ?? 0);
      const losses = (stat.losses ?? 0) + (existing?.losses ?? 0);
      const breakEven = (stat.breakEven ?? 0) + (existing?.breakEven ?? 0);
      const total = wins + losses + breakEven;
      statsByDay[day] = {
        wins,
        losses,
        breakEven,
        winRate: stat.winRate ?? (wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0),
        winRateWithBE: stat.winRateWithBE ?? (total > 0 ? (wins / total) * 100 : 0),
      };
    });

    // Build chart data: first the 7 canonical days (in order), then any other keys (e.g. "Unknown") so data always shows
    const knownDays = DAYS.map((day) => {
      const stats = statsByDay[day] ?? { wins: 0, losses: 0, breakEven: 0, winRate: 0, winRateWithBE: 0 };
      const totalTrades = stats.wins + stats.losses + stats.breakEven;
      return {
        day,
        totalTrades,
        wins: stats.wins,
        losses: stats.losses,
        breakEven: stats.breakEven,
        winRate: stats.winRate,
        winRateWithBE: stats.winRateWithBE,
      };
    });
    const otherDayKeys = Object.keys(statsByDay).filter((k) => !DAYS.includes(k));
    const otherDays = otherDayKeys.map((day) => {
      const stats = statsByDay[day];
      const totalTrades = stats.wins + stats.losses + stats.breakEven;
      return {
        day,
        totalTrades,
        wins: stats.wins,
        losses: stats.losses,
        breakEven: stats.breakEven,
        winRate: stats.winRate,
        winRateWithBE: stats.winRateWithBE,
      };
    });
    const chartData = [...knownDays, ...otherDays];

    // Use raw dayStats to decide "has trades" so we don't show "No trades" when data exists but labels differed
    const hasTrades =
      dayStats.some(
        (s) =>
          ((s.wins ?? 0) + (s.losses ?? 0) + (s.breakEven ?? 0)) > 0
      ) || chartData.some((d) => d.totalTrades > 0);

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-xl font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Days Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades based on day of the week
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    if (!hasTrades) {
      return (
        <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-xl font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Days Stats
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Distribution of trades based on day of the week
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <div className="flex flex-col justify-center items-center w-full h-full">
              <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
                No trades found
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
                There are no trades to display for this category yet. Start trading to see your statistics here!
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Days Stats
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Distribution of trades based on day of the week
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 flex items-end mt-1">
          <div className="w-full h-[250px]">
            <ComposedBarWinRateChart
              data={chartData as BarWinRateChartDatum[]}
              xAxisDataKey="day"
              xAxisTickFormatter={(value: string) => {
                const d = chartData.find((x) => x.day === value);
                return d ? `${getDayDisplayLabel(d.day)} (${d.totalTrades})` : getDayDisplayLabel(value ?? '');
              }}
              tooltipHeaderGetter={(d) => String(d.day ?? '')}
              isDark={isDark}
              beCalcEnabled={beCalcEnabled}
              idPrefix="dayComposed"
            />
          </div>
        </CardContent>
      </Card>
    );
  }
);
