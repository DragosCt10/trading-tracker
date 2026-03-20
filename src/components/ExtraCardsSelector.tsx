'use client';

import * as React from 'react';
import Image from 'next/image';
import { Check, Crown, Info, Search } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { EXTRA_CARDS, PRO_ONLY_EXTRA_CARD_KEYS, type ExtraCardKey } from '@/constants/extraCards';

interface ExtraCardsSelectorProps {
  selected: ExtraCardKey[];
  onChange: (keys: ExtraCardKey[]) => void;
  disabled?: boolean;
  isPro?: boolean;
}

export function ExtraCardsSelector({ selected, onChange, disabled, isPro = false }: ExtraCardsSelectorProps) {
  const [search, setSearch] = React.useState('');

  const toggle = (key: ExtraCardKey) => {
    if (disabled) return;
    if (!isPro && PRO_ONLY_EXTRA_CARD_KEYS.includes(key)) return;
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

  // Pro-only cards first, then the rest — order preserved within each group
  const sortedCards = React.useMemo(() => {
    const proCards = PRO_ONLY_EXTRA_CARD_KEYS.map((k) => EXTRA_CARDS.find((c) => c.key === k)!).filter(Boolean);
    const regularCards = EXTRA_CARDS.filter((c) => !PRO_ONLY_EXTRA_CARD_KEYS.includes(c.key));
    return [...proCards, ...regularCards];
  }, []);

  const filteredCards = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedCards;
    return sortedCards.filter(
      (card) =>
        card.label.toLowerCase().includes(q) ||
        card.key.replace(/_/g, ' ').includes(q) ||
        card.tooltip.toLowerCase().includes(q)
    );
  }, [search, sortedCards]);

  return (
    <div className="space-y-2.5">
      <div>
        <Label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
          Extra Stats Cards
        </Label>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
          Select which extra analytics cards to show on the strategy page.
        </p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <Input
          type="search"
          placeholder="Search cards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
          className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
          aria-label="Search extra cards"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {filteredCards.length === 0 ? (
          <p className="col-span-full text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            No cards match &quot;{search.trim()}&quot;
          </p>
        ) : (
          filteredCards.map((card) => {
            const isLocked = !isPro && PRO_ONLY_EXTRA_CARD_KEYS.includes(card.key);
            const isSelected = selected.includes(card.key);

            if (isLocked) {
              return (
                <div
                  key={card.key}
                  className="group relative flex flex-col rounded-xl border overflow-hidden border-amber-500/30 dark:border-amber-500/20 bg-amber-50/20 dark:bg-amber-900/10"
                >
                  {/* Image placeholder area */}
                  <div className="relative w-full aspect-[5/3] bg-slate-100 dark:bg-slate-800/50 overflow-hidden opacity-40">
                    <Image
                      src={card.image}
                      alt={card.label}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                    />
                  </div>

                  {/* PRO badge overlay */}
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-amber-500/90 dark:bg-amber-500/80 rounded-md px-1.5 py-0.5 shadow-sm">
                    <Crown className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                    <span className="text-[9px] font-bold text-white leading-none">PRO</span>
                  </div>

                  {/* Label + tooltip */}
                  <div className="px-2.5 py-2 flex items-start justify-between gap-1">
                    <span className="text-[11px] font-medium leading-tight block flex-1 min-w-0 text-slate-400 dark:text-slate-500">
                      {card.label}
                    </span>
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="flex-shrink-0 p-0.5 rounded text-slate-300 dark:text-slate-600 cursor-help"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="bottom"
                          className="max-w-[220px] rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 px-3 py-2"
                        >
                          <p className="text-xs leading-snug text-slate-600 dark:text-slate-400">{card.tooltip}</p>
                          <p className="text-xs font-semibold text-amber-500 mt-1">PRO feature — upgrade to unlock</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={card.key}
                type="button"
                onClick={() => toggle(card.key)}
                disabled={disabled}
                className={`
                  group relative flex flex-col rounded-xl border overflow-hidden
                  transition-all duration-200 cursor-pointer text-left
                  ${isSelected
                    ? 'border-[var(--tc-primary,#8b5cf6)] bg-[var(--tc-subtle,rgba(139,92,246,0.06))] shadow-sm shadow-[var(--tc-primary,#8b5cf6)]/10'
                    : 'border-slate-200/70 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-800/20 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                  }
                  ${disabled ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                {/* Image placeholder area */}
                <div className="relative w-full aspect-[5/3] bg-slate-100 dark:bg-slate-800/50 overflow-hidden">
                  <Image
                    src={card.image}
                    alt={card.label}
                    fill
                    className="object-cover opacity-60 dark:opacity-40"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[var(--tc-primary,#8b5cf6)] flex items-center justify-center shadow-md">
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Label + tooltip */}
                <div className="px-2.5 py-2 flex items-start justify-between gap-1">
                  <span
                    className={`text-[11px] font-medium leading-tight block flex-1 min-w-0 ${
                      isSelected
                        ? 'text-[var(--tc-text,#7c3aed)] dark:text-[var(--tc-text-dark,#a78bfa)]'
                        : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                    }`}
                  >
                    {card.label}
                  </span>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          className="flex-shrink-0 p-0.5 rounded text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-help"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="max-w-[220px] rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 px-3 py-2"
                      >
                        <p className="text-xs leading-snug text-slate-600 dark:text-slate-400">{card.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
