'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MAX_SUGGESTIONS = 20;
const MAX_CHARS = 12;
const DROPDOWN_OFFSET = 6;
/** Maximum saved types shown for setup / liquidity (enforced in merge utils when saving). */
const MAX_SAVED_TYPES = 11;

export interface CommonComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  /** When provided, used as the suggestion list when input is empty (e.g. only HOD/LOD for liquidity). */
  defaultSuggestions?: string[];
  /** Label for the "no match" message, e.g. "setup type" or "conditions / liquidity". */
  customValueLabel?: string;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Optional class for the dropdown list; when set, dropdown is portaled so it stays above modal/overflow, mirroring MarketCombobox. */
  dropdownClassName?: string;
  disabled?: boolean;
}

export function CommonCombobox({
  value,
  onChange,
  options,
  defaultSuggestions,
  customValueLabel = 'setup type',
  placeholder = 'Select or type setup',
  className,
  id,
  dropdownClassName,
  disabled,
}: CommonComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value ?? '');
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep input in sync with external value (like MarketCombobox)
  useEffect(() => {
    setInputValue(value ?? '');
  }, [value]);

  const usePortal = Boolean(dropdownClassName);

  const normalizedOptions = useMemo(
    () => Array.from(new Set(options.filter(Boolean))).slice(0, MAX_SAVED_TYPES),
    [options]
  );

  const suggestions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) {
      const defaultList =
        defaultSuggestions != null && defaultSuggestions.length > 0
          ? defaultSuggestions.filter((s) => normalizedOptions.includes(s))
          : normalizedOptions;
      return defaultList.slice(0, MAX_SUGGESTIONS);
    }
    const startsWith: string[] = [];
    const contains: string[] = [];
    normalizedOptions.forEach((opt) => {
      const lower = opt.toLowerCase();
      if (lower.startsWith(q)) {
        startsWith.push(opt);
      } else if (lower.includes(q)) {
        contains.push(opt);
      }
    });
    return [...startsWith, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [inputValue, normalizedOptions, defaultSuggestions]);

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
        top: rect.bottom + DROPDOWN_OFFSET,
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

  // Close when clicking outside (mirrors MarketCombobox: custom dropdown, Radix-safe)
  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if ((target as Element).closest?.('[data-common-combobox-list]')) return;
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
    // When portaled, only close on outside click or option select (not on blur) so dialog focus trap doesn't block clicks
    if (!usePortal) {
      blurTimeoutRef.current = setTimeout(() => setOpen(false), 180);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.slice(0, MAX_CHARS);
    setInputValue(next);
    onChange(next);
    setOpen(true);
  };

  const handleSelect = (item: string) => {
    const next = item.slice(0, MAX_CHARS);
    setInputValue(next);
    onChange(next);
    setOpen(false);
  };

  const showDropdown = open && suggestions.length > 0;
  const showNoMatch =
    open &&
    suggestions.length === 0 &&
    inputValue.trim().length > 0 &&
    normalizedOptions.length > 0;

  const baseDropdownClass =
    'max-h-56 overflow-auto rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 shadow-lg backdrop-blur-sm py-1';
  const baseNoMatchClass =
    'rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] shadow-lg backdrop-blur-sm px-3 py-4 text-sm text-slate-600 dark:text-slate-300';

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
        className={cn(
          'h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300',
          className
        )}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
      />

      {/* Non-portal dropdown (used when dropdownClassName not provided) */}
      {showDropdown && !usePortal && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1.5',
            baseDropdownClass,
            dropdownClassName
          )}
          role="listbox"
        >
          <ul>
            {suggestions.map((item) => (
              <li key={item} role="option">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm outline-none rounded-lg text-slate-900 dark:text-slate-50 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(item);
                  }}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showNoMatch && !usePortal && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1.5',
            baseNoMatchClass,
            dropdownClassName
          )}
        >
          No match in list. You can use your typed value as a custom {customValueLabel}.
        </div>
      )}

      {/* Portaled dropdown: mirrors MarketCombobox behaviour */}
      {showDropdown && usePortal && dropdownRect && typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              style={{ pointerEvents: 'none' }}
              aria-hidden
            />
            <div
              data-common-combobox-list
              role="listbox"
              className={cn(
                'fixed z-[9999]',
                baseDropdownClass,
                dropdownClassName
              )}
              style={{
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
                pointerEvents: 'auto',
              }}
            >
              <ul>
                {suggestions.map((item) => (
                  <li key={item} role="option">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm outline-none rounded-lg text-slate-900 dark:text-slate-50 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(item);
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(item);
                      }}
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
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
              data-common-combobox-list
              className={cn(
                'fixed z-[9999]',
                baseNoMatchClass,
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
              No match in list. You can use your typed value as a custom {customValueLabel}.
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
