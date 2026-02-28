'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as fuzz from 'fuzzball';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SavedNewsItem } from '@/types/account-settings';

const MAX_SUGGESTIONS = 8;
const FILTER_THRESHOLD = 30; // loose threshold while typing

/** Renders 1–3 filled stars followed by empty stars up to 3 */
function StarsIndicator({ intensity }: { intensity: number }) {
  return (
    <span className="text-amber-400 text-xs shrink-0 ml-auto pl-2" aria-label={`${intensity} star${intensity !== 1 ? 's' : ''}`}>
      {Array.from({ length: 3 }, (_, i) => (
        <span key={i}>{i < intensity ? '★' : '☆'}</span>
      ))}
    </span>
  );
}

export interface NewsComboboxProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when the user picks a saved item so intensity can be auto-filled */
  onSelect: (item: SavedNewsItem) => void;
  savedNews: SavedNewsItem[];
  placeholder?: string;
  className?: string;
  id?: string;
}

export function NewsCombobox({
  value,
  onChange,
  onSelect,
  savedNews,
  placeholder = 'e.g. CPI, NFP, FOMC',
  className,
  id,
}: NewsComboboxProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep internal value in sync with parent
  const inputValue = value;

  const suggestions = useMemo<SavedNewsItem[]>(() => {
    if (savedNews.length === 0) return [];
    const q = inputValue.trim().toLowerCase();

    if (!q) {
      // Empty input → show all saved news (most recent first, capped)
      return savedNews.slice(-MAX_SUGGESTIONS).reverse();
    }

    return savedNews
      .map((item) => {
        const candidates = [item.name, ...(item.aliases ?? [])].map((s) =>
          s.toLowerCase()
        );
        const score = Math.max(
          ...candidates.map((c) => fuzz.token_set_ratio(q, c))
        );
        return { item, score };
      })
      .filter(({ score }) => score >= FILTER_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS)
      .map(({ item }) => item);
  }, [inputValue, savedNews]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [open]);

  const handleFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
      blurTimeoutRef.current = null;
    }
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => setOpen(false), 180);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = (item: SavedNewsItem) => {
    onChange(item.name);
    onSelect(item);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const showDropdown = open && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(className)}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
      />
      {showDropdown && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-56 overflow-auto py-1"
        >
          {suggestions.map((item, idx) => (
            <li key={item.id} role="option" aria-selected={idx === activeIndex}>
              <button
                type="button"
                className={cn(
                  'w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none rounded-lg',
                  idx === activeIndex
                    ? 'bg-slate-100 dark:bg-slate-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
              >
                <span className="flex-1 truncate">{item.name}</span>
                <StarsIndicator intensity={item.intensity} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
