'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { BouncePulse } from '@/components/ui/bounce-pulse';
import { calculateAverageMonthlyTrades } from './AverageMonthlyTradesCard';

interface MonthlyStatsData {
  [month: string]: {
    wins: number;
    losses: number;
    beWins: number;
    beLosses: number;
    winRate: number;
    winRateWithBE: number;
  };
}

interface MonthlyStats {
  monthlyData?: MonthlyStatsData;
}

export interface AverageMonthlyTradesChartCardProps {
  monthlyStats: MonthlyStats;
  isLoading?: boolean;
}

export const AverageMonthlyTradesChartCard: React.FC<AverageMonthlyTradesChartCardProps> = React.memo(
  function AverageMonthlyTradesChartCard({ 
    monthlyStats,
    isLoading: externalLoading 
  }) {
    const [mounted, setMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (mounted) {
        if (externalLoading !== undefined) {
          if (externalLoading) {
            setIsLoading(true);
          } else {
            const timer = setTimeout(() => {
              setIsLoading(false);
            }, 600);
            return () => clearTimeout(timer);
          }
        } else {
          const timer = setTimeout(() => {
            setIsLoading(false);
          }, 1000);
          return () => clearTimeout(timer);
        }
      }
    }, [mounted, externalLoading]);

    const averageMonthlyTrades = useMemo(() => {
      return calculateAverageMonthlyTrades(monthlyStats);
    }, [monthlyStats]);

    if (!mounted || isLoading) {
      return (
        <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
          <CardHeader className="pb-2 flex-shrink-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
              Average Monthly Trades
            </CardTitle>
            <CardDescription className="text-base text-slate-500 dark:text-slate-400">
              Average number of trades per month
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex justify-center items-center">
            <BouncePulse size="md" />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Average Monthly Trades
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
            Average number of trades per month
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center relative pt-2 pb-4">
          {/* Center content */}
          <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
            <div className="text-center">
              <div className={`font-bold text-slate-900 dark:text-slate-100 ${
                averageMonthlyTrades >= 1000 ? 'text-6xl' : 
                averageMonthlyTrades >= 100 ? 'text-6xl' : 
                averageMonthlyTrades >= 10 ? 'text-7xl' :
                'text-8xl'
              }`}>
                {averageMonthlyTrades.toFixed(0)}
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-4">
                trades per month
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                (incl. BE)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
