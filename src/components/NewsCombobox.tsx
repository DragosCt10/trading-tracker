'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import * as fuzz from 'fuzzball';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { SavedNewsItem } from '@/types/account-settings';
import { Pencil, Loader2 } from 'lucide-react';

const MAX_SUGGESTIONS = 8;
const FILTER_THRESHOLD = 30; // loose threshold while typing
export const NEWS_INPUT_MAX_LENGTH = 20;

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
  /** Max characters allowed (default NEWS_INPUT_MAX_LENGTH). */
  maxLength?: number;
  /** Optional callback when a saved news item is renamed from the suggestions list. */
  onEditSavedNews?: (item: SavedNewsItem, newName: string) => Promise<void> | void;
}

export function NewsCombobox({
  value,
  onChange,
  onSelect,
  savedNews,
  placeholder = 'e.g. CPI, NFP, FOMC',
  className,
  id,
  maxLength = NEWS_INPUT_MAX_LENGTH,
  onEditSavedNews,
}: NewsComboboxProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
    if (editingId) return;
    blurTimeoutRef.current = setTimeout(() => setOpen(false), 180);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    if (maxLength != null && next.length > maxLength) return;
    onChange(next);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = (item: SavedNewsItem) => {
    onChange(item.name);
    onSelect(item);
    setOpen(false);
    setActiveIndex(-1);
  };

  const startEditNews = (item: SavedNewsItem) => {
    setEditingId(item.id);
    setEditingValue(item.name);
  };

  const cancelEditNews = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const saveEditNews = async (item: SavedNewsItem) => {
    const trimmed = editingValue.trim();
    if (!trimmed || trimmed === item.name || isSavingEdit) return;

    try {
      setIsSavingEdit(true);
      if (onEditSavedNews) {
        await onEditSavedNews(item, trimmed);
      }
      // If the current input was exactly this name, reflect the new name
      if (value === item.name) {
        onChange(trimmed);
      }
      cancelEditNews();
    } finally {
      setIsSavingEdit(false);
    }
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
        maxLength={maxLength}
        className={cn(className, maxLength != null && 'pr-12')}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-describedby={maxLength != null ? `${id ?? 'news-combobox'}-hint` : undefined}
      />
      {maxLength != null && (
        <span
          id={`${id ?? 'news-combobox'}-hint`}
          className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-slate-400 dark:text-slate-500 tabular-nums"
        >
          {inputValue.length}/{maxLength}
        </span>
      )}
      {showDropdown && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-56 overflow-auto rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 shadow-lg backdrop-blur-sm p-1"
        >
          {suggestions.map((item, idx) => (
            <li key={item.id} role="option" aria-selected={idx === activeIndex}>
              {editingId === item.id ? (
                <div className="flex items-center gap-2 px-3 py-2">
                  <Input
                    type="text"
                    value={editingValue}
                    autoFocus
                    maxLength={maxLength}
                    onChange={(e) => setEditingValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void saveEditNews(item);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        cancelEditNews();
                      }
                    }}
                    className="h-8 flex-1 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/60 text-xs"
                  />
                  <button
                    type="button"
                    className="px-2 py-1 text-xs rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      cancelEditNews();
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 text-xs rounded-full text-white font-semibold themed-btn-primary cursor-pointer disabled:opacity-60 shadow-sm"
                    disabled={
                      isSavingEdit ||
                      !editingValue.trim() ||
                      editingValue.trim() === item.name
                    }
                    onMouseDown={(e) => {
                      e.preventDefault();
                      void saveEditNews(item);
                    }}
                  >
                    <span className="flex items-center gap-1">
                      {isSavingEdit && <Loader2 className="h-3 w-3 animate-spin" />}
                      {isSavingEdit ? 'Saving...' : 'Save'}
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={cn(
                    'w-full flex items-center gap-2 text-left px-3 py-2 text-sm outline-none rounded-lg text-slate-900 dark:text-slate-50 transition-colors duration-150',
                    idx === activeIndex
                      ? 'bg-slate-100 dark:bg-slate-800'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                >
                  <span className="flex-1 truncate">{item.name}</span>
                  {onEditSavedNews && (
                    <span
                      role="button"
                      aria-label="Edit saved news"
                      className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-100 dark:hover:bg-slate-700"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        startEditNews(item);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </span>
                  )}
                  <StarsIndicator intensity={item.intensity} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
