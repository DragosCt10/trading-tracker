'use client';

import React, { useMemo, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { filterAllowedMarkets } from '@/constants/allowedMarkets';
import { normalizeMarket } from '@/utils/validateMarket';
import { cn } from '@/lib/utils';

const MAX_SUGGESTIONS = 80;

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

  const filtered = useMemo(
    () => filterAllowedMarkets(inputValue, MAX_SUGGESTIONS),
    [inputValue]
  );

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

  const handleBlur = () => {
    const normalized = normalizeMarket(inputValue);
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
    const v = e.target.value;
    setInputValue(v);
    onChange(v);
    setOpen(true);
  };

  const handleSelect = (market: string) => {
    setInputValue(market);
    onChange(market);
    setOpen(false);
  };

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
        className={cn(className)}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && !usePortal && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-60 overflow-auto py-1',
            dropdownClassName
          )}
          role="listbox"
        >
          {filtered.length > 0 ? (
            <ul>
              {filtered.map((market) => (
                <li key={market} role="option">
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 outline-none rounded-lg"
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
          ) : (
            <div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
              No match in list. You can use your typed value if it matches the format (e.g. EURUSD, EUR/USD).
            </div>
          )}
        </div>
      )}
      {open && usePortal && dropdownRect && typeof document !== 'undefined' &&
        createPortal(
          <>
            {/* Full-screen layer on top so dropdown stacks above dialog; pointer-events-none so only the list gets clicks */}
            <div
              className="fixed inset-0 z-[9998]"
              style={{ pointerEvents: 'none' }}
              aria-hidden
            />
            <div
              data-market-combobox-list
              role="listbox"
              className={cn(
                'fixed rounded-xl border border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-60 overflow-auto py-1 z-[9999]',
                dropdownClassName
              )}
              style={{
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
                pointerEvents: 'auto',
              }}
            >
              {filtered.length > 0 ? (
                <ul>
                  {filtered.map((market) => (
                    <li key={market} role="option">
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800 outline-none rounded-lg"
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
              ) : (
                <div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
                  No match in list. You can use your typed value if it matches the format (e.g. EURUSD, EUR/USD).
                </div>
              )}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
