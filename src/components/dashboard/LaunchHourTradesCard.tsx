'use client';

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

  const tradesWithoutBE = wins + losses;
  const winRate =
    tradesWithoutBE > 0 ? (wins / tradesWithoutBE) * 100 : 0;

  const totalWithBE = wins + losses + beWins + beLosses;
  const winRateWithBE =
    totalWithBE > 0 ? ((wins + beWins) / totalWithBE) * 100 : 0;

  return (
    <Card className="border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-800 mb-1">
          Launch Hour Trades
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Trades that were executed during the launch hour
        </CardDescription>
      </CardHeader>

      <CardContent className="h-72 flex flex-col items-center justify-center">
        <div className="w-full text-center">
          <div className="text-4xl font-medium text-slate-800 mb-2">
            {totalLaunchHour}
          </div>
          <div className="text-slate-500 text-sm mb-2">
            Total Launch Hour Trades
          </div>

          <div className="flex flex-col items-center justify-center gap-2 mt-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="text-emerald-500 font-medium text-lg">
                Wins:{' '}
                <span className="font-bold">{wins}</span>{' '}
                <span className="text-sm text-slate-500">
                  ({beWins} BE)
                </span>
              </div>
              <div className="text-red-500 font-medium text-lg">
                Losses:{' '}
                <span className="font-bold">{losses}</span>{' '}
                <span className="text-sm text-slate-500">
                  ({beLosses} BE)
                </span>
              </div>
            </div>

            <div className="font-semibold text-lg mt-2">
              <span className="font-medium">
                Winrate:{' '}
                {tradesWithoutBE > 0
                  ? winRate.toFixed(1)
                  : '0.0'}
                %
              </span>
              <span className="text-slate-500 text-sm ml-2">
                (
                {totalWithBE > 0
                  ? winRateWithBE.toFixed(1)
                  : '0.0'}
                % incl. BE)
              </span>
            </div>
          </div>

          {totalLaunchHour === 0 && (
            <div className="text-slate-400 text-sm mt-8">
              No launch hour trades in this period.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
