'use client';

import { TrendingUp, Pencil, Eye } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import { MOCK_EQUITY, CARD_PILLS } from './mockData';

export function CardMockup() {
  return (
    <div className="max-w-sm mx-auto">
      <Card className="rounded-2xl border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden">
        {/* Equity chart -- exact same as CustomStatCardItem */}
        <div className="h-24 w-full px-3 pt-3">
          <EquityCurveChart
            data={MOCK_EQUITY}
            currencySymbol="$"
            hasTrades
            isLoading={false}
            variant="card"
            hideAxisLabels
          />
        </div>

        {/* Card info -- exact same structure as CustomStatCardItem */}
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 min-w-0">
              Long DAX Morning
            </p>
            <div className="flex items-start shrink-0">
              <div className="inline-flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  +6.40%
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-end justify-between gap-4 mt-2">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Win Rate</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">62%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Trades</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">14</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Net P&amp;L</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">+$3,200.00</p>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-1 mt-3">
            {CARD_PILLS.map((pill) => (
              <span
                key={pill}
                className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300"
              >
                {pill}
              </span>
            ))}
          </div>

          {/* Bottom action row */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-xl px-3 text-xs cursor-pointer transition-colors duration-200 border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 font-medium"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-400 underline underline-offset-2">
              <Eye className="h-3 w-3" />
              View Details
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
