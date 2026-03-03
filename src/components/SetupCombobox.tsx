'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const MAX_SUGGESTIONS = 20;

export interface SetupComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  id?: string;
}

export function SetupCombobox({
  value,
  onChange,
  options,
  placeholder = 'Select or type setup',
  className,
  id,
}: SetupComboboxProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const inputValue = value ?? '';

  const normalizedOptions = useMemo(
    () => Array.from(new Set(options.filter(Boolean))),
    [options]
  );

  const suggestions = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) {
      return normalizedOptions.slice(0, MAX_SUGGESTIONS);
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
  }, [inputValue, normalizedOptions]);

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
    const next = e.target.value;
    onChange(next);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = (setup: string) => {
    onChange(setup);
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
        className={cn(
          'h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300',
          className
        )}
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
      />
      {showDropdown && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 z-50 mt-1.5 rounded-xl border border-slate-200/70 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 shadow-lg max-h-56 overflow-auto py-1"
        >
          {suggestions.map((setup, idx) => (
            <li key={setup} role="option" aria-selected={idx === activeIndex}>
              <button
                type="button"
                className={cn(
                  'w-full text-left px-3 py-2 text-sm outline-none rounded-lg',
                  idx === activeIndex
                    ? 'bg-slate-900/90 text-slate-50 dark:bg-slate-100 dark:text-slate-900'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100'
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(setup);
                }}
              >
                {setup}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

