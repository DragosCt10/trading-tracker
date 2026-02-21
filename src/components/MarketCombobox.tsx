'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  id?: string;
  disabled?: boolean;
}

export function MarketCombobox({
  value,
  onChange,
  onBlur,
  placeholder = 'Type market (e.g. EURUSD, EUR/USD)',
  className,
  id,
  disabled,
}: MarketComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep input in sync with value from parent (e.g. when normalized on blur elsewhere)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const filtered = useMemo(
    () => filterAllowedMarkets(inputValue, MAX_SUGGESTIONS),
    [inputValue]
  );

  // Close when clicking outside (custom dropdown avoids Radix focus/portal closing the list)
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
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
    // Close after delay so mousedown on an option runs first (option select doesn't blur)
    blurTimeoutRef.current = setTimeout(() => setOpen(false), 180);
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
      {open && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-60 overflow-auto py-1"
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
    </div>
  );
}
