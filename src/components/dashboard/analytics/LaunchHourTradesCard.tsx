'use client';

import { useState, useEffect } from 'react';
import { Trade } from '@/types/trade';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

interface LaunchHourTradesCardProps {
  filteredTrades: Trade[];
}

export function LaunchHourTradesCard({ filteredTrades }: LaunchHourTradesCardProps) {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for dark mode
    const checkDarkMode = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkDarkMode();
    // Watch for changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  const launchHourTrades = filteredTrades.filter((t) => t.launch_hour);
  const totalLaunchHour = launchHourTrades.length;

  const beWins = launchHourTrades.filter(
    (t) => t.break_even && t.trade_outcome === 'Win',
  ).length;
  const beLosses = launchHourTrades.filter(
    (t) => t.break_even && t.trade_outcome === 'Lose',
  ).length;

  const wins = launchHourTrades.filter(
    (t) => t.trade_outcome === 'Win' && !t.break_even,
  ).length;
  const losses = launchHourTrades.filter(
    (t) => t.trade_outcome === 'Lose' && !t.break_even,
  ).length;

  const totalWins = wins + beWins;
  const totalLosses = losses + beLosses;

  const tradesWithoutBE = wins + losses;
  const winRate =
    tradesWithoutBE > 0 ? (wins / tradesWithoutBE) * 100 : 0;

  const totalWithBE = wins + losses + beWins + beLosses;
  const winRateWithBE =
    totalWithBE > 0 ? ((wins + beWins) / totalWithBE) * 100 : 0;

  if (!mounted) {
    return (
      <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
            Launch Hour Trades
          </CardTitle>
          <CardDescription className="text-base text-slate-500 dark:text-slate-400">
            Trades that were executed during the launch hour
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex justify-center items-center">
          <div className="w-full h-full min-h-[180px]" aria-hidden>—</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm h-96 flex flex-col">
      <CardHeader className="pb-2 flex-shrink-0">
        <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-1">
          Launch Hour Trades
        </CardTitle>
        <CardDescription className="text-base text-slate-500 dark:text-slate-400 mb-3">
          Trades that were executed during the launch hour
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-center">
        {totalLaunchHour === 0 ? (
          <div className="flex flex-col justify-center items-center w-full h-full">
            <div className="text-base font-medium text-slate-600 dark:text-slate-300 text-center mb-1">
              No launch hour trades found
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-xs">
              No launch hour trades in this period.
            </div>
          </div>
        ) : (
          <div className="w-full text-center">
            <div className="text-4xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
              {totalLaunchHour}
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              Total Launch Hour Trades
            </div>

            <div className="flex flex-col items-center justify-center gap-4 mt-4">
              <div className="flex flex-wrap items-center justify-center gap-6">
                <div className="text-emerald-600 dark:text-emerald-400 font-medium text-lg">
                  Wins:{' '}
                  <span className="font-bold">{totalWins}</span>{' '}
                  {beWins > 0 && (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      ({beWins} BE)
                    </span>
                  )}
                </div>
                <div className="text-rose-600 dark:text-rose-400 font-medium text-lg">
                  Losses:{' '}
                  <span className="font-bold">{totalLosses}</span>{' '}
                  {beLosses > 0 && (
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      ({beLosses} BE)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 mt-2">
                <div className="font-semibold text-lg text-slate-900 dark:text-slate-100">
                  <span className="font-semibold">
                    Winrate:{' '}
                    {tradesWithoutBE > 0
                      ? winRate.toFixed(1)
                      : '0.0'}
                    %
                  </span>
                </div>
                <div className="text-slate-500 dark:text-slate-400 text-sm">
                  (
                  {totalWithBE > 0
                    ? winRateWithBE.toFixed(1)
                    : '0.0'}
                  % incl. BE)
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
