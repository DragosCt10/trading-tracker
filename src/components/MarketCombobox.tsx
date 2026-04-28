'use client';

import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { ALLOWED_MARKETS, filterAllowedMarkets } from '@/constants/allowedMarkets';
import { normalizeMarket } from '@/utils/validateMarket';
import { cn } from '@/lib/utils';
import { Pencil, Loader2, Star } from 'lucide-react';
import { sortByPins } from '@/utils/helpers/sortByPins';

const MAX_SUGGESTIONS = 80;
const MAX_CHARS = 8;

export interface MarketComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  /** Optional class for the dropdown list; when set, dropdown is portaled so it stays above modal/overflow */
  dropdownClassName?: string;
  id?: string;
  disabled?: boolean;
  /** When provided (e.g. user_settings.saved_markets), shown first on focus and when typing. Same flow as CommonCombobox defaultSuggestions. */
  defaultSuggestions?: string[];
  /** Optional callback when a saved market is renamed from the suggestions list. */
  onEditSavedMarket?: (oldValue: string, newValue: string) => Promise<void> | void;
  /** When provided with onTogglePin, show favourite star and sort by DB-backed pins (strategy.saved_favourites). */
  pinnedIds?: string[];
  /** Callback to toggle pin (persist to DB). When provided with pinnedIds, favourites are stored on the strategy. */
  onTogglePin?: (itemId: string) => void;
  /** Optional restricted pool. When set, replaces the global ALLOWED_MARKETS catalog as the source of typeable suggestions. */
  allowedSymbols?: string[];
  /** When true, disallow free-form custom values: clears the input on blur if it doesn't match an entry in `allowedSymbols`. */
  restrictToList?: boolean;
  /** Custom message shown when the typed value doesn't match any suggestion. Useful for futures restriction copy. */
  noMatchMessage?: string;
}

export function MarketCombobox({
  value,
  onChange,
  onBlur,
  placeholder = 'Type market (e.g. EURUSD, EUR/USD)',
  className,
  dropdownClassName,
  id,
  disabled,
  defaultSuggestions,
  onEditSavedMarket,
  pinnedIds = [],
  onTogglePin,
  allowedSymbols,
  restrictToList = false,
  noMatchMessage: noMatchMessageProp,
}: MarketComboboxProps) {
  const [open, setOpen] = useState(false);
  const showPin = Boolean(onTogglePin);
  const isPinned = (id: string) => pinnedIds.includes(id);
  const [inputValue, setInputValue] = useState(value);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingMarket, setEditingMarket] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Keep input in sync with value from parent (e.g. when normalized on blur elsewhere)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const usePortal = Boolean(dropdownClassName);

  // Pre-computed pool used when `allowedSymbols` restricts the catalog (e.g. futures-only mode).
  const allowedPoolUpper = useMemo(
    () => (allowedSymbols ? new Set(allowedSymbols.map((s) => s.toUpperCase())) : null),
    [allowedSymbols]
  );

  // Normalized saved markets (dedupe, keep order) — no cap so users can have as many as they want in the list.
  // When restricted, drop entries that aren't in the allowed pool so forex/crypto saved markets don't surface on futures accounts.
  const normalizedSaved = useMemo(() => {
    const base = Array.from(new Set((defaultSuggestions ?? []).filter(Boolean)));
    if (!allowedPoolUpper) return base;
    return base.filter((s) => allowedPoolUpper.has(s.toUpperCase()));
  }, [defaultSuggestions, allowedPoolUpper]);

  /** Source of typeable symbols: the restricted pool when provided, otherwise the global allowed-markets catalog. */
  const filterFromCatalog = (search: string): string[] => {
    if (allowedSymbols) {
      const s = search.trim().toUpperCase();
      if (!s) return allowedSymbols.slice(0, MAX_SUGGESTIONS);
      return allowedSymbols.filter((m) => m.toUpperCase().includes(s)).slice(0, MAX_SUGGESTIONS);
    }
    return filterAllowedMarkets(search, MAX_SUGGESTIONS);
  };

  // On focus (empty input): show only saved_markets (defaultSuggestions). When typing: filter allowed markets and put saved matches first.
  const suggestions = useMemo(() => {
    const q = inputValue.trim().toUpperCase();
    let list: string[];
    if (!q) {
      list = normalizedSaved.slice(0, MAX_SUGGESTIONS);
    } else {
      const fromAllowed = filterFromCatalog(inputValue);
      const lower = inputValue.trim().toLowerCase();
      const startsWith: string[] = [];
      const contains: string[] = [];
      normalizedSaved.forEach((m) => {
        const mLower = m.toLowerCase();
        if (mLower.startsWith(lower)) startsWith.push(m);
        else if (mLower.includes(lower)) contains.push(m);
      });
      const savedMatches = [...startsWith, ...contains];
      const allowedSet = new Set(fromAllowed.map((x) => x.toUpperCase()));
      const savedNotInAllowed = savedMatches.filter((m) => !allowedSet.has(m.toUpperCase()));
      list = [...savedNotInAllowed, ...fromAllowed].slice(0, MAX_SUGGESTIONS);
    }
    return showPin && pinnedIds.length > 0 ? sortByPins(list, pinnedIds, (s) => s) : list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, normalizedSaved, showPin, pinnedIds, allowedSymbols]);

  // When portaling: measure trigger and position dropdown; update on scroll/resize when open
  useLayoutEffect(() => {
    if (!usePortal || !open || !containerRef.current) {
      setDropdownRect(null);
      return;
    }
    const el = containerRef.current;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setDropdownRect({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [usePortal, open]);

  // Close when clicking outside (custom dropdown avoids Radix focus/portal closing the list)
  // Use capture so we run before other handlers; when target is inside portaled list, don't close
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      // When portaled, dropdown is in body; check the portal root by data attribute
      if ((target as Element).closest?.('[data-market-combobox-list]')) return;
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
  };

  const hasInput = inputValue.trim().length > 0;
  const showDropdown = open && suggestions.length > 0;
  /** When editing, render dropdown inline so the edit input stays inside modal focus scope and can receive typing */
  const renderDropdownInline = !usePortal || editingMarket !== null;
  const showNoMatch =
    open &&
    suggestions.length === 0 &&
    hasInput &&
    normalizedSaved.length >= 0;

  const handleBlur = () => {
    let normalized = normalizeMarket(inputValue).slice(0, MAX_CHARS);
    // Restricted mode: if the typed value isn't in the allowed pool, clear it so we never persist
    // an unsupported instrument (e.g. a forex pair on a futures account).
    if (restrictToList && allowedPoolUpper && normalized && !allowedPoolUpper.has(normalized.toUpperCase())) {
      normalized = '';
    }
    if (normalized !== inputValue) {
      setInputValue(normalized);
      onChange(normalized);
    }
    onBlur?.();
    // When portaled, only close on outside click or option select (not on blur) so dialog focus trap doesn't block clicks
    if (!usePortal) {
      blurTimeoutRef.current = setTimeout(() => setOpen(false), 180);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.slice(0, MAX_CHARS);
    setInputValue(v);
    onChange(v);
    setOpen(true);
  };

  const handleSelect = (market: string) => {
    const capped = market.slice(0, MAX_CHARS);
    setInputValue(capped);
    onChange(capped);
    setOpen(false);
  };

  const startEditMarket = (market: string) => {
    setEditingMarket(market);
    setEditingValue(market);
  };

  const cancelEditMarket = () => {
    setEditingMarket(null);
    setEditingValue('');
  };

  const saveEditMarket = async () => {
    if (!editingMarket) return;
    const trimmed = normalizeMarket(editingValue).slice(0, MAX_CHARS);
    if (!trimmed || trimmed === editingMarket || isSavingEdit) return;

    try {
      setIsSavingEdit(true);
      if (onEditSavedMarket) {
        await onEditSavedMarket(editingMarket, trimmed);
      }
      if (value === editingMarket) {
        setInputValue(trimmed);
        onChange(trimmed);
      }
      cancelEditMarket();
    } finally {
      setIsSavingEdit(false);
    }
  };

  /** Max height to show ~4 suggestions; inner list scrolls for more */
  const dropdownWrapClass =
    'max-h-[10.5rem] flex flex-col overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 shadow-lg backdrop-blur-sm p-1';
  const listScrollClass =
    'flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain';
  /** Stop wheel from bubbling to Radix Dialog so the list actually scrolls */
  const onListWheel = (e: React.WheelEvent) => e.stopPropagation();
  const noMatchMessage =
    noMatchMessageProp ??
    (restrictToList
      ? 'No match. Add this contract from Settings → Custom Futures Specs to use it.'
      : 'No match in list. You can use your typed value if it matches the format (e.g. EURUSD, EUR/USD).');

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        maxLength={MAX_CHARS}
        className={cn(className)}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
      />
      {showDropdown && renderDropdownInline && (
        <div
          className={cn('absolute top-full left-0 right-0 z-50 mt-1.5', dropdownWrapClass, dropdownClassName)}
          role="listbox"
        >
          <div className={listScrollClass} onWheel={onListWheel} role="presentation">
            <ul>
              {suggestions.map((market) => (
                <li key={market} role="option" aria-selected={market === value}>
                  {editingMarket === market ? (
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <Input
                        type="text"
                        value={editingValue}
                        autoFocus
                        maxLength={MAX_CHARS}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void saveEditMarket();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEditMarket();
                          }
                        }}
                        className="h-8 flex-1 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/60 text-xs"
                      />
                      <button
                        type="button"
                        className="px-2 py-1 text-xs rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          cancelEditMarket();
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
                          normalizeMarket(editingValue).slice(0, MAX_CHARS) === editingMarket
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          void saveEditMarket();
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
                      className="w-full text-left px-3 py-2.5 text-sm outline-none rounded-lg text-slate-900 dark:text-slate-50 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(market);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{market}</span>
                        <span className="flex items-center gap-0.5 shrink-0">
                          <span
                            role="button"
                            aria-label={isPinned(market) ? 'Unpin' : 'Pin to top'}
                            className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onTogglePin?.(market);
                            }}
                          >
                            <Star
                              className={cn('h-3.5 w-3.5', isPinned(market) && 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400')}
                            />
                          </span>
                          {onEditSavedMarket && normalizedSaved.includes(market) && (
                            <span
                              role="button"
                              aria-label="Edit saved market"
                              className="ml-0.5 inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-100 dark:hover:bg-slate-700"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                startEditMarket(market);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </span>
                          )}
                        </span>
                      </div>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {showNoMatch && renderDropdownInline && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-auto rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] shadow-lg backdrop-blur-sm py-1 text-sm text-slate-600 dark:text-slate-300 px-3 py-4',
            dropdownClassName
          )}
        >
          {noMatchMessage}
        </div>
      )}
      {showDropdown && usePortal && !editingMarket && dropdownRect && typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              style={{ pointerEvents: 'none' }}
              aria-hidden
            />
            <div
              data-market-combobox-list
              role="listbox"
              className={cn('fixed z-[9999]', dropdownWrapClass, dropdownClassName)}
              style={{
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
                pointerEvents: 'auto',
              }}
            >
              <div className={listScrollClass} onWheel={onListWheel} role="presentation">
                <ul>
                  {suggestions.map((market) => (
                    <li key={market} role="option" aria-selected={market === value}>
                      {editingMarket === market ? (
                        <div className="flex items-center gap-2 px-3 py-2.5">
                          <Input
                            type="text"
                            value={editingValue}
                            autoFocus
                            maxLength={MAX_CHARS}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void saveEditMarket();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelEditMarket();
                              }
                            }}
                            className="h-8 flex-1 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/60 text-xs"
                          />
                          <button
                            type="button"
                            className="px-2 py-1 text-xs rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              cancelEditMarket();
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
                              normalizeMarket(editingValue).slice(0, MAX_CHARS) === editingMarket
                            }
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void saveEditMarket();
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
                          className="w-full text-left px-3 py-2.5 text-sm outline-none rounded-lg text-slate-900 dark:text-slate-50 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelect(market);
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleSelect(market);
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{market}</span>
                            <span className="flex items-center gap-0.5 shrink-0">
                              <span
                                role="button"
                                aria-label={isPinned(market) ? 'Unpin' : 'Pin to top'}
                                className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  onTogglePin?.(market);
                                }}
                              >
                                <Star
                                  className={cn('h-3.5 w-3.5', isPinned(market) && 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400')}
                                />
                              </span>
                              {onEditSavedMarket && normalizedSaved.includes(market) && (
                                <span
                                  role="button"
                                  aria-label="Edit saved market"
                                  className="ml-0.5 inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-100 dark:hover:bg-slate-700"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    startEditMarket(market);
                                  }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </span>
                              )}
                            </span>
                          </div>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>,
          document.body
        )}
      {showNoMatch && usePortal && !editingMarket && dropdownRect && typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              style={{ pointerEvents: 'none' }}
              aria-hidden
            />
            <div
              data-market-combobox-list
              className={cn(
                'fixed z-[9999] max-h-60 overflow-auto rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] shadow-lg backdrop-blur-sm px-3 py-4 text-sm text-slate-600 dark:text-slate-300',
                dropdownClassName
              )}
              style={{
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
                pointerEvents: 'auto',
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {noMatchMessage}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
