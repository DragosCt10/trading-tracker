'use client';

import * as React from 'react';
import clsx from 'clsx';
import { ChevronDown, Check } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useRouter } from 'next/navigation';

export interface StrategyOption {
  id: string;
  name: string;
  slug: string;
}

interface StrategySelectPopoverProps {
  strategies: StrategyOption[];
  currentSlug: string;
}

export function StrategySelectPopover({ strategies, currentSlug }: StrategySelectPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const current = strategies.find((s) => s.slug === currentSlug);
  const triggerLabel = current?.name ?? 'Select strategy';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Select strategy"
          className={clsx(
            'group flex items-center gap-2 min-w-0',
            'h-8 overflow-hidden rounded-xl border border-slate-200/80 bg-transparent text-slate-700',
            'hover:bg-slate-100/60 hover:text-slate-900 hover:border-slate-300/80',
            'dark:border-slate-700/80 dark:bg-transparent dark:text-slate-200',
            'dark:hover:bg-slate-800/50 dark:hover:text-slate-50 dark:hover:border-slate-600/80',
            'px-2 sm:px-4 text-xs sm:text-sm font-medium transition-colors duration-200',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50',
          )}
        >
          <span className="font-medium max-w-[120px] sm:max-w-[200px] truncate">
            {triggerLabel}
          </span>
          <ChevronDown
            className={clsx(
              'h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200',
              open && 'rotate-180'
            )}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto min-w-[200px] max-w-[min(280px,calc(100vw-2rem))] max-h-[min(320px,70vh)] flex flex-col rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 px-3 pt-2 pb-2 text-slate-900 dark:text-slate-50"
      >
        <div className="px-2 pt-1.5 pb-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 select-none">
          Strategies
        </div>
        <div className="overflow-y-auto overscroll-contain flex flex-col gap-1">
          {strategies.map((strategy) => {
            const isActive = strategy.slug === currentSlug;
            return (
              <button
                key={strategy.id}
                type="button"
                className={clsx(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left cursor-pointer',
                  'transition-colors duration-150',
                  'focus:outline-none',
                  isActive
                    ? 'bg-[var(--tc-subtle)] text-[var(--tc-text)] dark:text-[var(--tc-text-dark)] font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium'
                )}
                onClick={() => {
                  router.push(`/strategy/${strategy.slug}`);
                  setOpen(false);
                }}
              >
                <Check
                  className={clsx(
                    'h-3.5 w-3.5 flex-shrink-0 transition-opacity',
                    isActive
                      ? 'opacity-100 text-[var(--tc-primary)]'
                      : 'opacity-0'
                  )}
                />
                <span className="truncate">{strategy.name}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
