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

interface NonExecutedTradesCardProps {
  nonExecutedTrades: Trade[];
}

export function NonExecutedTradesCard({
  nonExecutedTrades,
}: NonExecutedTradesCardProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const totalNonExecuted = nonExecutedTrades.length;

  const beWins = nonExecutedTrades.filter(
    (t) => t.break_even && t.trade_outcome === 'Win',
  ).length;
  const beLosses = nonExecutedTrades.filter(
    (t) => t.break_even && t.trade_outcome === 'Lose',
  ).length;

  const wins = nonExecutedTrades.filter(
    (t) => t.trade_outcome === 'Win' && !t.break_even,
  ).length;
  const losses = nonExecutedTrades.filter(
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
          Non Executed Trades
        </CardTitle>
        <CardDescription className="text-sm text-slate-500">
          Trades that were planned but not executed
        </CardDescription>
      </CardHeader>

      <CardContent className="h-72 flex flex-col items-center justify-center">
        <div className="w-full text-center">
          <div className="text-4xl font-medium text-slate-800 mb-2">
            {mounted ? totalNonExecuted : '\u2014'}
          </div>
          <div className="text-slate-500 text-sm mb-2">
            Total Non Executed Trades
          </div>

          <div className="flex flex-col items-center justify-center gap-2 mt-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="text-emerald-500 font-medium text-lg">
                Wins:{' '}
                <span className="font-bold">{mounted ? wins : '—'}</span>{' '}
                <span className="text-sm text-slate-500">
                  ({mounted ? beWins : '—'} BE)
                </span>
              </div>
              <div className="text-red-500 font-medium text-lg">
                Losses:{' '}
                <span className="font-bold">{mounted ? losses : '—'}</span>{' '}
                <span className="text-sm text-slate-500">
                  ({mounted ? beLosses : '—'} BE)
                </span>
              </div>
            </div>

            <div className="font-semibold text-lg mt-2">
              <span className="font-medium">
                Winrate:{' '}
                {mounted
                  ? (tradesWithoutBE > 0 ? winRate.toFixed(1) : '0.0')
                  : '—'}
                %
              </span>
              <span className="text-slate-500 text-sm ml-2">
                (
                {mounted
                  ? (totalWithBE > 0 ? winRateWithBE.toFixed(1) : '0.0')
                  : '—'}
                % incl. BE)
              </span>
            </div>
          </div>

          {mounted && totalNonExecuted === 0 && (
            <div className="text-slate-400 text-sm mt-8">
              No non executed trades in this period.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
