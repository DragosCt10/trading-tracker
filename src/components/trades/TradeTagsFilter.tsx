'use client';

import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Tag, X } from 'lucide-react';
import type { SavedTag } from '@/types/saved-tag';
import { resolveTagColorStyle } from '@/constants/tagColors';

export type TradeTagsFilterProps = {
  availableTags: string[];
  selectedTags: string[];
  onChange: (next: string[]) => void;
  label?: string;
  /** Strategy's saved tag vocabulary — used to color chips to match TradeCard. */
  savedTags?: SavedTag[];
};

export function TradeTagsFilter({
  availableTags,
  selectedTags,
  onChange,
  label = 'Tags:',
  savedTags,
}: TradeTagsFilterProps) {
  const [open, setOpen] = useState(false);

  const toggleTag = (tag: string) => {
    onChange(
      selectedTags.includes(tag)
        ? selectedTags.filter((t) => t !== tag)
        : [...selectedTags, tag]
    );
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap">
        {label}
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-xl border border-slate-200/70 dark:border-slate-700/50 !bg-slate-50/50 dark:!bg-slate-800/30 backdrop-blur-xl shadow-none px-3 text-xs font-medium text-slate-900 dark:text-white themed-focus cursor-pointer transition-all duration-300"
            aria-label="Filter by tags"
          >
            <Tag className="h-3.5 w-3.5 text-slate-900 dark:text-white" />
            {selectedTags.length === 0 ? (
              <span className="text-slate-900 dark:text-white">All</span>
            ) : (
              <span className="font-semibold">{selectedTags.length} selected</span>
            )}
            <ChevronDown className="h-3.5 w-3.5 text-slate-900 dark:text-white" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="z-[100] w-72 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50 p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
              Filter by tags
            </span>
            {selectedTags.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
          {availableTags.length > 0 ? (
            <>
              <div className="max-h-64 overflow-y-auto overflow-x-hidden flex flex-wrap gap-1.5 pr-1 -mr-1">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  const text = tag.length > 22 ? tag.slice(0, 21) + '…' : tag;
                  const savedTag = savedTags?.find((t) => t.name === tag);
                  const style = resolveTagColorStyle(savedTag?.color);
                  return (
                    <button
                      key={tag}
                      type="button"
                      title={tag}
                      onClick={() => toggleTag(tag)}
                      style={{ background: style.gradient }}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white shadow-sm cursor-pointer transition-all duration-150',
                        isSelected
                          ? 'shadow-md brightness-110 saturate-125'
                          : 'opacity-70 hover:opacity-100 hover:brightness-110'
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      <span>{text}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/70 dark:border-slate-700/50 text-[11px] text-slate-900 dark:text-white">
                Trades matching any selected tag.
              </div>
            </>
          ) : (
            <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No tags on trades in this period.
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
