'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Eye, Pin } from 'lucide-react';
import { Note } from '@/types/note';
import { format } from 'date-fns';
import { Trade } from '@/types/trade';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import TradeDetailsModal from '@/components/TradeDetailsModal';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  userId: string;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const [tradeForModal, setTradeForModal] = useState<Trade | null>(null);

  const linkedTrades = note.linkedTradesFull ?? [];

  const handleTradeClick = (e: React.MouseEvent, trade: Trade) => {
    e.stopPropagation();
    e.preventDefault();
    setTradeForModal(trade);
  };

  // Strip markdown and get preview
  const getPreview = (content: string): string => {
    // Remove markdown syntax
    const plainText = content
      .replace(/#{1,6}\s+/g, '') // Headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1') // Italic
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Links
      .replace(/`([^`]+)`/g, '$1') // Inline code
      .replace(/```[\s\S]*?```/g, '') // Code blocks
      .trim();

    return plainText;
  };

  const preview = getPreview(note.content);
  const formattedDate = format(new Date(note.created_at), 'MMM d, yyyy');

  return (
    <>
    <Card
      className="relative overflow-hidden border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm cursor-pointer hover:shadow-md transition-all duration-200"
      onClick={onClick}
    >
      <CardContent className="p-6 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50 line-clamp-2 flex-1 pr-2">
            {note.title}
          </h3>
          {note.is_pinned && (
            <Pin className="h-4 w-4 flex-shrink-0" style={{ color: 'var(--tc-primary)' }} />
          )}
        </div>

        {preview && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3 flex-1 overflow-hidden text-ellipsis">
            {preview}
          </p>
        )}

        <div className="space-y-2 mb-4">
          {(note.strategy || (note.strategies && note.strategies.length > 0)) && (
            <div className="flex items-start gap-2 flex-wrap">
              {(() => {
                const strategyCount = note.strategies?.length || (note.strategy ? 1 : 0);
                const label = strategyCount === 1 ? 'Strategy:' : 'Strategies:';
                return (
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">{label}</span>
                );
              })()}
              <div className="flex flex-wrap gap-1.5">
                {note.strategies && note.strategies.length > 0 ? (
                  note.strategies.map((strategy) => (
                    <Badge
                      key={strategy.id}
                      className="bg-[var(--tc-subtle)] border border-[var(--tc-border)] text-[var(--tc-text)] dark:text-[var(--tc-text-dark)] hover:bg-[var(--tc-subtle)] shadow-none text-xs"
                    >
                      {strategy.name}
                    </Badge>
                  ))
                ) : note.strategy ? (
                  <Badge className="bg-[var(--tc-subtle)] border border-[var(--tc-border)] text-[var(--tc-text)] dark:text-[var(--tc-text-dark)] hover:bg-[var(--tc-subtle)] shadow-none text-xs">
                    {note.strategy.name}
                  </Badge>
                ) : null}
              </div>
            </div>
          )}
          {note.trade_refs && note.trade_refs.length > 0 && (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Linked:</span>
              {linkedTrades.length > 0 ? (
                <TooltipProvider>
                  <Tooltip delayDuration={160}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="shadow-none text-xs font-normal bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-200/80 dark:hover:bg-slate-700/80"
                      >
                        {note.trade_refs.length} trade{note.trade_refs.length === 1 ? '' : 's'}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      align="start"
                      sideOffset={6}
                      className={cn(
                        'w-48 max-h-[280px] overflow-y-auto p-4 text-xs bg-white/95 dark:bg-slate-800/98 border border-slate-200/60 dark:border-slate-600/50 text-slate-900 dark:text-slate-100 shadow-2xl dark:shadow-slate-900/50 rounded-2xl backdrop-blur-xl space-y-1.5'
                      )}
                    >
                      <div className="font-semibold text-slate-700 dark:text-slate-200 mb-2">Linked trades</div>
                      {linkedTrades.map((t, i) => (
                        <button
                          key={t.id ?? i}
                          type="button"
                          onClick={(e) => handleTradeClick(e, t)}
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-2 rounded-lg py-1.5 px-1 -mx-1 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 focus:ring-offset-1',
                            'hover:bg-slate-100/80 dark:hover:bg-slate-700/40'
                          )}
                          title="View trade details"
                          aria-label={`View details for ${t.market} trade`}
                        >
                          <Eye className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-slate-50 truncate">
                              {t.market}
                            </span>
                            <span
                              className={cn(
                                'font-semibold shrink-0',
                                t.break_even
                                  ? 'text-slate-500 dark:text-slate-400'
                                  : t.calculated_profit != null && t.calculated_profit >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400',
                              )}
                            >
                              {t.break_even
                                ? t.trade_outcome === 'Win'
                                  ? 'W (BE)'
                                  : 'L (BE)'
                                : t.trade_outcome === 'Win'
                                  ? 'W'
                                  : 'L'}
                              {!t.break_even && t.pnl_percentage != null && ` (${t.pnl_percentage.toFixed(2)}%)`}
                            </span>
                          </div>
                        </button>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Badge
                  variant="outline"
                  className="shadow-none text-xs font-normal bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-600 cursor-default"
                >
                  {note.trade_refs.length} trade{note.trade_refs.length === 1 ? '' : 's'}
                </Badge>
              )}
            </div>
          )}
          <span className="text-xs text-slate-500 dark:text-slate-500">
            {formattedDate}
          </span>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="inline-flex items-center text-sm text-[var(--tc-text)] dark:text-[var(--tc-text-dark)] hover:opacity-90 underline cursor-pointer mt-auto"
        >
          View Details
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </CardContent>
    </Card>
      <TradeDetailsModal
        trade={tradeForModal}
        isOpen={!!tradeForModal}
        onClose={() => setTradeForModal(null)}
      />
    </>
  );
}
