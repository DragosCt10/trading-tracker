'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Pencil, Loader2, Star } from 'lucide-react';
import { sortByPins } from '@/utils/helpers/sortByPins';

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
  /** Optional callback when a saved option is renamed from the suggestions list. */
  onEditSavedOption?: (oldValue: string, newValue: string) => Promise<void> | void;
  /** When provided with onTogglePin, show favourite star and sort by DB-backed pins (strategy.saved_favourites). */
  pinnedIds?: string[];
  /** Callback to toggle pin (persist to DB). When provided with pinnedIds, favourites are stored on the strategy. */
  onTogglePin?: (itemId: string) => void;
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
  onEditSavedOption,
  pinnedIds = [],
  onTogglePin,
}: CommonComboboxProps) {
  const [open, setOpen] = useState(false);
  const showPin = Boolean(onTogglePin);
  const isPinned = (id: string) => pinnedIds.includes(id);
  const [inputValue, setInputValue] = useState(value ?? '');
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
    let list: string[];
    if (!q) {
      const defaultList =
        defaultSuggestions != null && defaultSuggestions.length > 0
          ? defaultSuggestions.filter((s) => normalizedOptions.includes(s))
          : normalizedOptions;
      list = defaultList.slice(0, MAX_SUGGESTIONS);
    } else {
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
      list = [...startsWith, ...contains].slice(0, MAX_SUGGESTIONS);
    }
    return showPin && pinnedIds.length > 0 ? sortByPins(list, pinnedIds, (s) => s) : list;
  }, [inputValue, normalizedOptions, defaultSuggestions, showPin, pinnedIds]);

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

  const startEditOption = (item: string) => {
    setEditingOption(item);
    setEditingValue(item);
  };

  const cancelEditOption = () => {
    setEditingOption(null);
    setEditingValue('');
  };

  const saveEditOption = async () => {
    if (!editingOption) return;
    const trimmed = editingValue.trim();
    if (!trimmed || trimmed === editingOption || isSavingEdit) return;

    try {
      setIsSavingEdit(true);
      if (onEditSavedOption) {
        await onEditSavedOption(editingOption, trimmed);
      }
      // If the currently selected value was this option, reflect the new name in the input
      if (value === editingOption) {
        setInputValue(trimmed);
        onChange(trimmed);
      }
      cancelEditOption();
    } finally {
      setIsSavingEdit(false);
    }
  };

  const showDropdown = open && suggestions.length > 0;
  /** When editing, render dropdown inline so the edit input stays inside modal focus scope and can receive typing */
  const renderDropdownInline = !usePortal || editingOption !== null;
  const showNoMatch =
    open &&
    suggestions.length === 0 &&
    inputValue.trim().length > 0 &&
    normalizedOptions.length > 0;

  /** Max height to show ~4 suggestions; inner list scrolls for more */
  const dropdownWrapClass =
    'max-h-[10.5rem] flex flex-col overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 shadow-lg backdrop-blur-sm p-1';
  const listScrollClass =
    'flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain';
  /** Stop wheel from bubbling to Radix Dialog so the list actually scrolls */
  const onListWheel = (e: React.WheelEvent) => e.stopPropagation();
  const baseNoMatchClass =
    'rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] shadow-lg backdrop-blur-sm p-1 text-sm text-slate-600 dark:text-slate-300';

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

      {/* Inline dropdown (when no portal, or when editing so focus stays inside modal) */}
      {showDropdown && renderDropdownInline && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 z-50 mt-1.5',
            dropdownWrapClass,
            dropdownClassName
          )}
          role="listbox"
        >
          <div className={listScrollClass} onWheel={onListWheel} role="presentation">
            <ul>
              {suggestions.map((item) => (
                <li key={item} role="option">
                  {editingOption === item ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Input
                        type="text"
                        value={editingValue}
                        autoFocus
                        maxLength={MAX_CHARS}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void saveEditOption();
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelEditOption();
                          }
                        }}
                        className="h-8 flex-1 rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/60 text-xs"
                      />
                      <button
                        type="button"
                        className="px-2 py-1 text-xs rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          cancelEditOption();
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
                          editingValue.trim() === editingOption
                        }
                        onMouseDown={(e) => {
                          e.preventDefault();
                          void saveEditOption();
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
                      className="w-full text-left px-3 py-2 text-sm outline-none rounded-lg text-slate-900 dark:text-slate-50 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(item);
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate">{item}</span>
                        <span className="flex items-center gap-0.5 shrink-0">
                          {showPin && (
                            <span
                              role="button"
                              aria-label={isPinned(item) ? 'Unpin' : 'Pin to top'}
                              className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onTogglePin?.(item);
                              }}
                            >
                              <Star
                                className={cn('h-3.5 w-3.5', isPinned(item) && 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400')}
                              />
                            </span>
                          )}
                          {onEditSavedOption && (
                            <span
                              role="button"
                              aria-label={`Edit ${customValueLabel}`}
                              className="ml-0.5 inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-100 dark:hover:bg-slate-700"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                startEditOption(item);
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
            'absolute top-full left-0 right-0 z-50 mt-1.5',
            baseNoMatchClass,
            dropdownClassName
          )}
        >
          No match in list. You can use your typed value as a custom {customValueLabel}.
        </div>
      )}

      {/* Portaled dropdown (only when not editing, so modal focus trap doesn't steal focus from edit input) */}
      {showDropdown && usePortal && !editingOption && dropdownRect && typeof document !== 'undefined' &&
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
                dropdownWrapClass,
                dropdownClassName
              )}
              style={{
                top: dropdownRect.top,
                left: dropdownRect.left,
                width: dropdownRect.width,
                pointerEvents: 'auto',
              }}
            >
              <div className={listScrollClass} onWheel={onListWheel} role="presentation">
                <ul>
                  {suggestions.map((item) => (
                    <li key={item} role="option">
                      {editingOption === item ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <Input
                            type="text"
                            value={editingValue}
                            autoFocus
                            maxLength={MAX_CHARS}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void saveEditOption();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelEditOption();
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
                              cancelEditOption();
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
                              editingValue.trim() === editingOption
                            }
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void saveEditOption();
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
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{item}</span>
                            <span className="flex items-center gap-0.5 shrink-0">
                              {showPin && (
                                <span
                                  role="button"
                                  aria-label={isPinned(item) ? 'Unpin' : 'Pin to top'}
                                  className="inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onTogglePin?.(item);
                                  }}
                                >
                                  <Star
                                    className={cn('h-3.5 w-3.5', isPinned(item) && 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400')}
                                  />
                                </span>
                              )}
                              {onEditSavedOption && (
                                <span
                                  role="button"
                                  aria-label={`Edit ${customValueLabel}`}
                                  className="ml-0.5 inline-flex items-center justify-center rounded-md p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-100 dark:hover:bg-slate-700"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    startEditOption(item);
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
