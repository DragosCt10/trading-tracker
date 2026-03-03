'use client';

import Image from 'next/image';
import { Check, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { EXTRA_CARDS, type ExtraCardKey } from '@/constants/extraCards';

interface ExtraCardsSelectorProps {
  selected: ExtraCardKey[];
  onChange: (keys: ExtraCardKey[]) => void;
  disabled?: boolean;
}

export function ExtraCardsSelector({ selected, onChange, disabled }: ExtraCardsSelectorProps) {
  const toggle = (key: ExtraCardKey) => {
    if (disabled) return;
    if (selected.includes(key)) {
      onChange(selected.filter((k) => k !== key));
    } else {
      onChange([...selected, key]);
    }
  };

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

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {EXTRA_CARDS.map((card) => {
          const isSelected = selected.includes(card.key);

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
                      <p className="text-xs leading-snug">{card.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
