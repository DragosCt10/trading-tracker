'use client';

import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { ALLOWED_MARKETS, filterAllowedMarkets } from '@/constants/allowedMarkets';
import { normalizeMarket } from '@/utils/validateMarket';
import { cn } from '@/lib/utils';

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
}: MarketComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep input in sync with value from parent (e.g. when normalized on blur elsewhere)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const usePortal = Boolean(dropdownClassName);

  // Normalized saved markets (dedupe, keep order) — no cap so users can have as many as they want in the list
  const normalizedSaved = useMemo(
    () => Array.from(new Set((defaultSuggestions ?? []).filter(Boolean))),
    [defaultSuggestions]
  );

  // On focus (empty input): show only saved_markets (defaultSuggestions). When typing: filter allowed markets and put saved matches first.
  const suggestions = useMemo(() => {
    const q = inputValue.trim().toUpperCase();
    if (!q) {
      return normalizedSaved.slice(0, MAX_SUGGESTIONS);
    }
    const fromAllowed = filterAllowedMarkets(inputValue, MAX_SUGGESTIONS);
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
    return [...savedNotInAllowed, ...fromAllowed].slice(0, MAX_SUGGESTIONS);
  }, [inputValue, normalizedSaved]);

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
  const showNoMatch =
    open &&
    suggestions.length === 0 &&
    hasInput &&
    normalizedSaved.length >= 0;

  const handleBlur = () => {
    const normalized = normalizeMarket(inputValue).slice(0, MAX_CHARS);
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

  /** Max height to show ~4 suggestions; inner list scrolls for more */
  const dropdownWrapClass =
    'max-h-[10.5rem] flex flex-col overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 shadow-lg backdrop-blur-sm p-1';
  const listScrollClass =
    'flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain';
  /** Stop wheel from bubbling to Radix Dialog so the list actually scrolls */
  const onListWheel = (e: React.WheelEvent) => e.stopPropagation();
  const noMatchMessage =
    'No match in list. You can use your typed value if it matches the format (e.g. EURUSD, EUR/USD).';

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
      {showDropdown && !usePortal && (
        <div
          className={cn('absolute top-full left-0 right-0 z-50 mt-1.5', dropdownWrapClass, dropdownClassName)}
          role="listbox"
        >
          <div className={listScrollClass} onWheel={onListWheel} role="presentation">
            <ul>
              {suggestions.map((market) => (
                <li key={market} role="option">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-sm outline-none rounded-lg text-slate-900 dark:text-slate-50 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(market);
                    }}
                  >
                    {market}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {showNoMatch && !usePortal && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1.5 max-h-60 overflow-auto rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] shadow-lg backdrop-blur-sm py-1 text-sm text-slate-600 dark:text-slate-300 px-3 py-4',
            dropdownClassName
          )}
        >
          {noMatchMessage}
        </div>
      )}
      {showDropdown && usePortal && dropdownRect && typeof document !== 'undefined' &&
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
                    <li key={market} role="option">
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
                        {market}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>,
          document.body
        )}
      {showNoMatch && usePortal && dropdownRect && typeof document !== 'undefined' &&
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
