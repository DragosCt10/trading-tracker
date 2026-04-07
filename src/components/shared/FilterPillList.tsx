'use client';

import { useMemo } from 'react';
import { buildFilterPills } from '@/utils/applyCustomStatFilter';
import { resolveTagColorStyle } from '@/constants/tagColors';
import type { CustomStatFilter } from '@/types/customStats';
import type { SavedTag } from '@/types/saved-tag';

interface FilterPillListProps {
  filters: CustomStatFilter;
  savedTags: SavedTag[];
  maxVisible?: number;
}

export function FilterPillList({ filters, savedTags, maxVisible = 3 }: FilterPillListProps) {
  const filterPills = useMemo(() => buildFilterPills({ ...filters, tags: undefined }), [filters]);
  const tagPills = useMemo(
    () => (filters.tags ?? []).map((name) => ({
      name,
      label: name.length > 20 ? name.slice(0, 19) + '…' : name,
      style: resolveTagColorStyle(savedTags.find((t) => t.name === name)?.color),
    })),
    [filters.tags, savedTags]
  );

  const allPillCount = filterPills.length + tagPills.length;
  if (allPillCount === 0) return null;

  const visiblePills = filterPills.slice(0, maxVisible);
  const visibleTagPills = tagPills.slice(0, Math.max(0, maxVisible - visiblePills.length));
  const extraPillCount = allPillCount - visiblePills.length - visibleTagPills.length;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {visiblePills.map((pill) => (
        <span
          key={pill}
          className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300"
        >
          {pill}
        </span>
      ))}
      {visibleTagPills.map((tp) => (
        <span
          key={tp.name}
          title={tp.name}
          className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full text-white"
          style={{ background: tp.style.gradient }}
        >
          {tp.label}
        </span>
      ))}
      {extraPillCount > 0 && (
        <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400">
          +{extraPillCount} more
        </span>
      )}
    </div>
  );
}
