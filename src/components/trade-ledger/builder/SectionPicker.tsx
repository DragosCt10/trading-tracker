'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  SECTION_CATEGORIES,
  SECTION_REGISTRY,
  type SectionCategoryId,
} from '@/lib/tradeLedger/sectionRegistry';
import type { ReportConfig } from '@/lib/tradeLedger/reportConfig';

type Sections = ReportConfig['sections'];

interface SectionPickerProps {
  sections: Sections;
  onChange: (updater: (prev: Sections) => Sections) => void;
}

export function SectionPicker({ sections, onChange }: SectionPickerProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SECTION_REGISTRY;
    return SECTION_REGISTRY.filter(
      (s) =>
        s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          type="search"
          placeholder="Search stats…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
        />
      </div>

      {SECTION_CATEGORIES.map((cat) => {
        const categoryStats = filtered.filter((s) => s.category === cat.id);
        if (categoryStats.length === 0 && query) return null;
        const conf = sections[cat.id];
        return (
          <CategoryBlock
            key={cat.id}
            categoryId={cat.id}
            label={cat.label}
            description={cat.description}
            stats={categoryStats}
            enabled={conf.enabled}
            picks={conf.picks}
            onToggleEnabled={(next) =>
              onChange((prev) => ({
                ...prev,
                [cat.id]: { ...prev[cat.id], enabled: next },
              }))
            }
            onTogglePick={(statId) =>
              onChange((prev) => {
                const current = prev[cat.id];
                const has = current.picks.includes(statId);
                return {
                  ...prev,
                  [cat.id]: {
                    ...current,
                    picks: has
                      ? current.picks.filter((p) => p !== statId)
                      : [...current.picks, statId],
                  },
                };
              })
            }
            onSelectAll={() =>
              onChange((prev) => ({
                ...prev,
                [cat.id]: {
                  enabled: true,
                  picks: SECTION_REGISTRY.filter((s) => s.category === cat.id).map((s) => s.id),
                },
              }))
            }
            onClear={() =>
              onChange((prev) => ({
                ...prev,
                [cat.id]: { ...prev[cat.id], picks: [] },
              }))
            }
          />
        );
      })}
    </div>
  );
}

function CategoryBlock({
  categoryId,
  label,
  description,
  stats,
  enabled,
  picks,
  onToggleEnabled,
  onTogglePick,
  onSelectAll,
  onClear,
}: {
  categoryId: SectionCategoryId;
  label: string;
  description: string;
  stats: typeof SECTION_REGISTRY;
  enabled: boolean;
  picks: string[];
  onToggleEnabled: (next: boolean) => void;
  onTogglePick: (statId: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(enabled);
  void categoryId;
  return (
    <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 overflow-hidden transition-all duration-300">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/40 dark:hover:bg-slate-900/40 text-left transition-colors cursor-pointer"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-slate-400" />
        )}
        <span
          role="checkbox"
          aria-checked={enabled}
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(!enabled);
          }}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              onToggleEnabled(!enabled);
            }
          }}
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-md border-2 shadow-sm cursor-pointer transition-colors duration-150',
            enabled
              ? 'themed-header-icon-box border-transparent text-white'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800',
          )}
        >
          {enabled && <Check className="h-3.5 w-3.5" />}
        </span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {label}
          </div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {description} · {picks.length}/{stats.length} selected
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-200/50 dark:border-slate-700/50 px-4 py-3 space-y-1 bg-white/30 dark:bg-slate-900/30">
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50 hover:underline cursor-pointer"
            >
              Select all
            </button>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer"
            >
              Clear
            </button>
          </div>
          {stats.map((s) => {
            const checked = picks.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onTogglePick(s.id)}
                aria-pressed={checked}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-left transition-colors cursor-pointer',
                  'min-h-[44px]',
                  'hover:bg-white/60 dark:hover:bg-slate-800/60',
                  checked
                    ? 'text-slate-900 dark:text-slate-50 font-medium'
                    : 'text-slate-700 dark:text-slate-300',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-md border-2 shadow-sm transition-colors duration-150',
                    checked
                      ? 'themed-header-icon-box border-transparent text-white'
                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800',
                  )}
                >
                  {checked && <Check className="h-3.5 w-3.5" />}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
