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
}: CommonComboboxProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const inputValue = value ?? '';

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

  // Portal: measure position when open so dropdown can render above modal/cards (like Select)
  useLayoutEffect(() => {
    if (!open) {
      setDropdownRect(null);
      return;
    }
    const updateRect = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownRect({
          top: rect.bottom + DROPDOWN_OFFSET,
          left: rect.left,
          width: rect.width,
        });
      }
    };
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
      setActiveIndex(-1);
    };
    document.addEventListener('mousedown', handleMouseDown, true);
    return () => document.removeEventListener('mousedown', handleMouseDown, true);
  }, [open]);

  const handleFocus = () => {
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleBlur = () => {
    // Slight delay so clicks on suggestions still register
    setTimeout(() => {
      setOpen(false);
      setActiveIndex(-1);
    }, 150);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.slice(0, MAX_CHARS);
    onChange(next);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = (item: string) => {
    onChange(item.slice(0, MAX_CHARS));
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
  const showNoMatch =
    open &&
    suggestions.length === 0 &&
    inputValue.trim().length > 0 &&
    normalizedOptions.length > 0;

  const dropdownListClass =
    'max-h-56 overflow-auto rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 shadow-lg backdrop-blur-sm py-1 z-[100]';
  const noMatchClass =
    'rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] shadow-lg backdrop-blur-sm px-3 py-4 text-sm text-slate-600 dark:text-slate-300 z-[100]';

  const portalContent =
    typeof document !== 'undefined' &&
    dropdownRect &&
    (showDropdown || showNoMatch)
      ? createPortal(
          showDropdown ? (
            <ul
              role="listbox"
              className={dropdownListClass}
              style={{
                position: 'fixed',
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
              }}
            >
              {suggestions.map((item, idx) => (
                <li key={item} role="option" aria-selected={idx === activeIndex}>
                  <button
                    type="button"
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm outline-none rounded-lg text-slate-900 dark:text-slate-50 transition-colors duration-150',
                      idx === activeIndex
                        ? 'bg-slate-100 dark:bg-slate-800'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
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
          ) : (
            <div
              className={noMatchClass}
              style={{
                position: 'fixed',
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
              }}
            >
              No match in list. You can use your typed value as a custom {customValueLabel}.
            </div>
          ),
          document.body
        )
      : null;

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
        maxLength={MAX_CHARS}
        className={cn(
          'h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300',
          className
        )}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
      />
      {portalContent}
    </div>
  );
}
