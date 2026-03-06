'use client';

import { useMemo, useState } from 'react';
import type { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';
import { getIntervalForTime } from '@/constants/analytics';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye } from 'lucide-react';

export type TradeCardProps = {
  trade: Trade;
  onOpenModal: (t: Trade) => void;
  hideDetailsLink?: boolean;
  isSelected?: boolean;
  onSelect?: (t: Trade) => void;
  hideImage?: boolean;
};

export function TradeCard({
  trade,
  onOpenModal,
  hideDetailsLink,
  isSelected,
  onSelect,
  hideImage,
}: TradeCardProps) {
  const screens = useMemo(
    () => (trade.trade_screens ?? []).filter(Boolean),
    [trade.trade_screens]
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const hasMultiple = screens.length > 1;
  const activeScreen = screens[activeIdx] ?? null;
  const timeDisplay = useMemo(() => {
    const raw = trade.trade_time ?? '';
    if (!raw) return '';
    const interval = getIntervalForTime(raw);
    if (interval?.label) return interval.label;
    return typeof raw === 'string' && raw.length >= 5 ? raw.substring(0, 5) : String(raw);
  }, [trade.trade_time]);

  return (
    <Card
      onClick={onSelect ? () => onSelect(trade) : undefined}
      className={cn(
        'relative overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm hover:shadow-xl hover:shadow-slate-300/50 dark:hover:shadow-slate-900/50 transition-all duration-300',
        onSelect && 'cursor-pointer',
        isSelected && 'themed-selected-card'
      )}
    >
      {!hideImage && (
        <div className="p-4">
          {activeScreen ? (
            <div className="relative">
              <a
                href={activeScreen}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-video bg-slate-100 dark:bg-slate-700/50 rounded-lg relative overflow-hidden cursor-pointer hover:opacity-95 transition-opacity group"
              >
                <img
                  src={activeScreen}
                  alt={`${trade.market} trade screen ${activeIdx + 1}`}
                  className="w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e2e8f0" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8"%3ENo Image%3C/text%3E%3C/svg%3E';
                  }}
                />
                {hasMultiple && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-2 py-0.5 rounded-full pointer-events-none select-none">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-3 h-3 shrink-0"
                    >
                      <path
                        fillRule="evenodd"
                        d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {activeIdx + 1}/{screens.length}
                  </div>
                )}
                {hasMultiple && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveIdx((i) => (i - 1 + screens.length) % screens.length);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white rounded-full w-7 h-7 flex items-center justify-center"
                    aria-label="Previous screen"
                    type="button"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      className="w-3.5 h-3.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                )}
                {hasMultiple && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setActiveIdx((i) => (i + 1) % screens.length);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/45 hover:bg-black/65 backdrop-blur-sm text-white rounded-full w-7 h-7 flex items-center justify-center"
                    aria-label="Next screen"
                    type="button"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      className="w-3.5 h-3.5"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>
                  </button>
                )}
              </a>

              {hasMultiple && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  {screens.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveIdx(i)}
                      className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                        i === activeIdx
                          ? 'w-4 bg-slate-600 dark:bg-slate-300'
                          : 'w-1.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
                      }`}
                      aria-label={`Screen ${i + 1}`}
                      type="button"
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-video bg-slate-100 dark:bg-slate-700/50 rounded-lg relative overflow-hidden">
              <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-12 h-12"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      <CardContent className={cn('px-5 pb-6', hideImage ? 'pt-5' : 'pt-0')}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {trade.market}
          </h3>
          <div className="flex items-center gap-1">
            {(trade.break_even || trade.trade_outcome === 'BE') ? (
              <>
                <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-orange-400 to-orange-500 dark:from-orange-500 dark:to-orange-600 text-white">
                  BE
                </Badge>
                {trade.be_final_result && (
                  <Badge
                    className={`shadow-none border-none outline-none ring-0 ${
                      trade.be_final_result === 'Win'
                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                        : 'bg-gradient-to-br from-rose-500 to-rose-300 text-white'
                    }`}
                  >
                    {trade.be_final_result}
                  </Badge>
                )}
              </>
            ) : (
              <Badge
                className={`shadow-none border-none outline-none ring-0 ${
                  trade.trade_outcome === 'Win'
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                    : 'bg-gradient-to-br from-rose-500 to-rose-300 text-white'
                }`}
              >
                {trade.trade_outcome}
              </Badge>
            )}

            {!trade.executed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="shadow-none border-none outline-none ring-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white cursor-pointer">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="size-4"
                    >
                      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl"
                >
                  <div className="text-slate-600 dark:text-slate-300">Not executed trade</div>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div className={cn('space-y-2.5', hideImage ? 'mb-0' : 'mb-5')}>
          <div className="flex items-center text-slate-500 dark:text-slate-300 text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 mr-2.5 text-slate-500 dark:text-slate-300"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              />
            </svg>
            <span className="font-medium">{trade.trade_date}</span>
          </div>
          <div className="flex items-center text-slate-500 dark:text-slate-300 text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4 mr-2.5 text-slate-500 dark:text-slate-300"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <span className="font-medium">{timeDisplay}</span>
          </div>
        </div>

        {!hideDetailsLink && (
          <button
            onClick={() => onOpenModal(trade)}
            className="inline-flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-4 decoration-slate-300 dark:decoration-slate-600 hover:decoration-slate-500 dark:hover:decoration-slate-400 transition-colors cursor-pointer group"
            type="button"
          >
            <Eye className="w-4 h-4 mr-1.5 shrink-0" />
            Trade Details
          </button>
        )}
      </CardContent>
    </Card>
  );
}

