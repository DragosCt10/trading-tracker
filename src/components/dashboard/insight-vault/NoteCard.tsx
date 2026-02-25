'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Pin } from 'lucide-react';
import { Note } from '@/types/note';
import { format } from 'date-fns';
import { Trade } from '@/types/trade';
import TradeDetailsModal from '@/components/TradeDetailsModal';

interface NoteCardProps {
  note: Note;
  onClick: () => void;
  userId: string;
}

export function NoteCard({ note, onClick }: NoteCardProps) {
  const [tradeForModal, setTradeForModal] = useState<Trade | null>(null);
  const [linkedHover, setLinkedHover] = useState(false);

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
            <div
              className="relative flex items-center gap-1.5"
              onMouseEnter={() => setLinkedHover(true)}
              onMouseLeave={() => setLinkedHover(false)}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Linked:</span>
              <Badge
                variant="outline"
                className="shadow-none text-xs font-normal bg-slate-100/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-600 cursor-default"
              >
                {note.trade_refs.length} trade{note.trade_refs.length === 1 ? '' : 's'}
              </Badge>
              {linkedHover && linkedTrades.length > 0 && (
                <div className="absolute left-0 top-full z-50 mt-1 min-w-[200px] max-w-[280px] max-h-[240px] overflow-y-auto rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900 shadow-lg shadow-slate-900/10 dark:shadow-black/30 py-1">
                  <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 border-b border-slate-200/70 dark:border-slate-700/50">
                    Linked trades
                  </div>
                  <ul className="py-0.5">
                    {linkedTrades.map((t) => (
                      <li key={`${t.id}-${t.mode}`}>
                        <button
                          type="button"
                          onClick={(e) => handleTradeClick(e, t)}
                          className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex flex-col gap-0.5"
                        >
                          <span className="font-medium truncate">{t.market}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {format(new Date(t.trade_date), 'MMM d, yyyy')} · {t.direction} · {t.trade_outcome}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
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
