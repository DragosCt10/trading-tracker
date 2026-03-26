'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Pencil, Trash2, Loader2, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { sortByPins } from '@/utils/helpers/sortByPins';
import type { SavedTag, TagColor } from '@/types/saved-tag';
import { TAG_COLORS, TAG_COLOR_STYLES, resolveTagColorStyle } from '@/constants/tagColors';

interface TagInputProps {
  tags: string[];
  savedTags: SavedTag[];
  onChange: (tags: string[]) => void;
  onCreateTag?: (tag: SavedTag) => void;
  onRenameTag?: (oldName: string, newName: string) => Promise<void>;
  onUpdateColor?: (tagName: string, color: TagColor) => Promise<void>;
  onDeleteTag?: (tag: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  pinnedTags?: string[];
  onTogglePin?: (tag: string) => void;
}

const MAX_TAG_LENGTH = 10;
const MAX_TAGS = 10;

function normalizeTag(value: string): string {
  return value.toLowerCase().trim().slice(0, MAX_TAG_LENGTH);
}

function truncateTag(tag: string): string {
  if (tag.length > MAX_TAG_LENGTH) return tag.slice(0, MAX_TAG_LENGTH - 1) + '…';
  return tag;
}

export function TagInput({ tags, savedTags, onChange, onCreateTag, onRenameTag, onUpdateColor, onDeleteTag, placeholder = 'Add tag...', className = '', pinnedTags, onTogglePin }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editColor, setEditColor] = useState<TagColor>('slate');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmTag, setDeleteConfirmTag] = useState<string | null>(null);
  // Color picker state for new tag creation
  const [pendingTag, setPendingTag] = useState<string | null>(null);
  const [pendingColor, setPendingColor] = useState<TagColor>('slate');
  // Track colors for tags created this session (before savedTags updates)
  const [localTagColors, setLocalTagColors] = useState<Record<string, TagColor>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // When the color picker opens, focus it so focus doesn't fall to document.body
  // (which would cause the parent modal to scroll).
  useEffect(() => {
    if (pendingTag !== null) {
      colorPickerRef.current?.focus();
    }
  }, [pendingTag]);

  const normalized = inputValue.trim().toLowerCase();
  const atLimit = tags.length >= MAX_TAGS;
  const showPin = Boolean(onTogglePin);
  const isPinned = (tag: string) => pinnedTags?.includes(tag) ?? false;

  const suggestions = (() => {
    const available = savedTags.filter(t => !tags.includes(t.name));
    let list: SavedTag[];
    if (normalized === '') {
      list = [...available].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      const startsWith: SavedTag[] = [];
      const contains: SavedTag[] = [];
      available.forEach(t => {
        if (t.name.startsWith(normalized)) startsWith.push(t);
        else if (t.name.includes(normalized)) contains.push(t);
      });
      list = [...startsWith.sort((a, b) => a.name.localeCompare(b.name)), ...contains.sort((a, b) => a.name.localeCompare(b.name))];
    }
    return showPin && pinnedTags?.length ? sortByPins(list, pinnedTags, t => t.name) : list;
  })();

  const showCreate = !atLimit && normalized.length > 0 && !tags.includes(normalized) && !savedTags.some(t => t.name === normalized);

  // Dropdown styling to match `MarketCombobox` (box + gradient + hover states).
  const dropdownWrapClass =
    'max-h-[10.5rem] flex flex-col overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] text-slate-900 dark:text-slate-50 shadow-lg backdrop-blur-sm p-1';
  const listScrollClass =
    'flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain';
  /** Prevent wheel scrolling from bubbling to modal/dialog containers. */
  const onListWheel = (e: React.WheelEvent) => e.stopPropagation();

  function addTag(value: string) {
    const norm = normalizeTag(value);
    if (!norm || tags.includes(norm) || tags.length >= MAX_TAGS) return;
    onChange([...tags, norm]);
    setInputValue('');
    inputRef.current?.focus();
  }

  function confirmNewTag() {
    if (!pendingTag) return;
    const norm = normalizeTag(pendingTag);
    if (!norm || tags.includes(norm) || tags.length >= MAX_TAGS) {
      setPendingTag(null);
      setPendingColor('slate');
      return;
    }
    onChange([...tags, norm]);
    onCreateTag?.({ name: norm, color: pendingColor });
    setLocalTagColors(prev => ({ ...prev, [norm]: pendingColor }));
    setPendingTag(null);
    setPendingColor('slate');
    setInputValue('');
    setDropdownOpen(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function cancelNewTag() {
    setPendingTag(null);
    setPendingColor('slate');
    // Input is unmounted while color picker is open; defer focus until after re-render
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function removeTag(tag: string) {
    onChange(tags.filter(t => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (pendingTag !== null) {
      if (e.key === 'Enter') { e.preventDefault(); confirmNewTag(); }
      if (e.key === 'Escape') { e.preventDefault(); cancelNewTag(); }
      return;
    }
    if (e.key === 'Enter' && normalized.length > 0) {
      e.preventDefault();
      const existsInVocab = savedTags.some(t => t.name === normalized);
      if (existsInVocab || tags.includes(normalized)) {
        addTag(normalized);
      } else {
        // New tag — show color picker
        setPendingTag(normalized);
        setPendingColor('slate');
        setDropdownOpen(false);
      }
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  }

  function startEdit(tag: string) {
    const existing = savedTags.find(t => t.name === tag);
    setEditingTag(tag);
    setEditValue(tag);
    setEditColor(existing?.color ?? 'slate');
  }

  function cancelEdit() {
    setEditingTag(null);
    setEditValue('');
    setEditColor('slate');
    inputRef.current?.focus();
  }

  async function confirmEdit() {
    if (!editingTag || (!onRenameTag && !onUpdateColor)) return;
    const newName = editValue.toLowerCase().trim();
    if (!newName || isSaving) return;
    if (newName !== editingTag && savedTags.some(t => t.name === newName)) return;
    setIsSaving(true);
    try {
      if (newName !== editingTag && onRenameTag) {
        await onRenameTag(editingTag, newName);
        if (onUpdateColor) await onUpdateColor(newName, editColor);
        if (tags.includes(editingTag)) {
          onChange(tags.map(t => t === editingTag ? newName : t));
        }
      } else if (onUpdateColor) {
        await onUpdateColor(editingTag, editColor);
      }
      cancelEdit();
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete(tag: string) {
    if (!onDeleteTag || isSaving) return;
    setIsSaving(true);
    try {
      await onDeleteTag(tag);
      // Remove from selected tags if present
      if (tags.includes(tag)) {
        onChange(tags.filter(t => t !== tag));
      }
    } finally {
      setIsSaving(false);
    }
  }

  /**
   * Close the dropdown only when focus leaves the entire component.
   * Using relatedTarget so clicks on dropdown items (which receive focus)
   * don't trigger a close — including when the edit Input gets autoFocus.
   */
  function handleContainerBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setDropdownOpen(false);
      setEditingTag(null);
      setEditValue('');
      setEditColor('slate');
      if (pendingTag !== null) {
        setPendingTag(null);
        setPendingColor('slate');
      }
    }
  }

  const showDropdown = dropdownOpen && !pendingTag && (suggestions.length > 0 || showCreate);
  const canManage = Boolean(onRenameTag || onDeleteTag || onUpdateColor);

  return (
    <div ref={containerRef} className={`relative ${className}`} onBlur={handleContainerBlur}>
      <div
        // Match the project's input look (height/radius/shadows) used across modals and panels.
        className="flex flex-wrap items-center gap-1.5 min-h-12 max-h-28 overflow-y-auto w-full rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 px-4 py-2 text-sm cursor-text"
        onClick={() => { if (!pendingTag) { inputRef.current?.focus(); setDropdownOpen(true); } }}
      >
        {tags.map(tag => {
          const savedTag = savedTags.find(t => t.name === tag);
          const style = resolveTagColorStyle(savedTag?.color ?? localTagColors[tag]);
          return (
            <span
              key={tag}
              title={tag}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium max-w-[140px] border border-white/20 text-white shadow-sm"
              style={{ background: style.gradient }}
            >
              <span className="truncate">{truncateTag(tag)}</span>
              <button
                type="button"
                className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity text-white"
                onClick={e => { e.stopPropagation(); removeTag(tag); }}
                aria-label={`Remove tag ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          );
        })}
        {!atLimit && !pendingTag && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            maxLength={MAX_TAG_LENGTH}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[80px] bg-transparent outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm py-1 text-slate-900 dark:text-slate-50"
            onChange={e => { setInputValue(e.target.value); setDropdownOpen(true); }}
            onKeyDown={handleKeyDown}
            onFocus={() => setDropdownOpen(true)}
          />
        )}
        {atLimit && (
          <span className="text-xs text-slate-400 dark:text-slate-500 py-1">Max {MAX_TAGS} tags</span>
        )}
      </div>

      {/* Color picker for new tag creation */}
      {pendingTag !== null && (
        <div ref={colorPickerRef} tabIndex={-1} className="mt-1 rounded-xl border border-slate-200/60 dark:border-slate-800/70 bg-white dark:bg-gradient-to-br dark:from-[#0d0a12] dark:via-[#120d16] dark:to-[#0f0a14] shadow-lg backdrop-blur-sm p-3 space-y-2 outline-none">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pick a color for <span className="font-semibold text-slate-900 dark:text-slate-50">{truncateTag(pendingTag)}</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TAG_COLORS.map(color => {
              const style = TAG_COLOR_STYLES[color];
              return (
                <button
                  key={color}
                  type="button"
                  title={style.label}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => setPendingColor(color)}
                  style={{ backgroundColor: style.dotColor }}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-all',
                    pendingColor === color ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:scale-105',
                  )}
                />
              );
            })}
          </div>
          <div className="flex gap-2 pt-0.5">
            <button
              type="button"
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
              onMouseDown={e => e.preventDefault()}
              onClick={cancelNewTag}
            >
              Cancel
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:opacity-80 transition-opacity cursor-pointer"
              onMouseDown={e => e.preventDefault()}
              onClick={confirmNewTag}
            >
              Add tag
            </button>
          </div>
        </div>
      )}

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full" aria-hidden={false}>
          <div className={dropdownWrapClass}>
            <div className={listScrollClass} onWheel={onListWheel} role="presentation">
              {suggestions.map(savedTag => (
                <div key={savedTag.name} className="flex items-center group">
                  {editingTag === savedTag.name ? (
                    <div className="flex flex-col gap-2 px-2 py-2 w-full">
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          autoFocus
                          maxLength={MAX_TAG_LENGTH}
                          onChange={e => setEditValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); void confirmEdit(); }
                            if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                          }}
                          className="h-9 flex-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-800/60 text-sm themed-focus text-slate-900 dark:text-slate-50 px-3"
                        />
                        <button
                          type="button"
                          className="h-9 px-3 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer shrink-0 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-700/60"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={isSaving || !editValue.trim() || savedTags.some(t => t.name === editValue.toLowerCase().trim() && t.name !== editingTag)}
                          className="h-9 px-4 text-sm rounded-full text-white font-semibold themed-btn-primary cursor-pointer disabled:opacity-60 shadow-sm shrink-0"
                          onClick={() => void confirmEdit()}
                        >
                          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                        </button>
                      </div>
                      {onUpdateColor && (
                        <div className="flex flex-wrap gap-1.5 px-1">
                          {TAG_COLORS.map(color => {
                            const style = TAG_COLOR_STYLES[color];
                            return (
                              <button
                                key={color}
                                type="button"
                                title={style.label}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => setEditColor(color)}
                                style={{ backgroundColor: style.dotColor }}
                                className={cn(
                                  'w-5 h-5 rounded-full border-2 transition-all',
                                  editColor === color ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent hover:scale-105',
                                )}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div
                        role="button"
                        tabIndex={0}
                        title={savedTag.name}
                        className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm outline-none rounded-lg text-slate-900 dark:text-slate-50 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800"
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => addTag(savedTag.name)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag(savedTag.name);
                          }
                        }}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: resolveTagColorStyle(savedTag.color).dotColor }}
                          />
                          <span className="truncate">{truncateTag(savedTag.name)}</span>
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {showPin && (
                            <button
                              type="button"
                              className="p-1 rounded-md text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors cursor-pointer"
                              title={isPinned(savedTag.name) ? 'Unpin tag' : 'Pin to top'}
                              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                              onClick={e => { e.stopPropagation(); onTogglePin!(savedTag.name); }}
                            >
                              <Star className={cn('h-3.5 w-3.5', isPinned(savedTag.name) && 'fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400')} />
                            </button>
                          )}
                          {canManage && (
                            <div className="flex items-center gap-0.5">
                              {(onRenameTag || onUpdateColor) && (
                                <button
                                  type="button"
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                                  title="Edit tag"
                                  onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                                  onClick={e => { e.stopPropagation(); startEdit(savedTag.name); }}
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              )}
                              {onDeleteTag && (
                                <button
                                  type="button"
                                  className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer transition-colors"
                                  title="Delete tag"
                                  disabled={isSaving}
                                  onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                                  onClick={e => { e.stopPropagation(); setDeleteConfirmTag(savedTag.name); }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              {showCreate && (
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 text-sm outline-none rounded-lg text-slate-600 dark:text-slate-300 transition-colors duration-150 hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-slate-100 dark:focus:bg-slate-800"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    setPendingTag(normalized);
                    setPendingColor('slate');
                    setDropdownOpen(false);
                  }}
                >
                  Create tag: <span className="font-medium text-slate-900 dark:text-slate-50">{truncateTag(normalized)}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={deleteConfirmTag !== null} onOpenChange={open => { if (!open) setDeleteConfirmTag(null); }}>
        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient !rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="text-red-500 dark:text-red-400 font-semibold text-lg">Confirm Delete</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-slate-600 dark:text-slate-400">Are you sure you want to delete the tag &ldquo;{deleteConfirmTag}&rdquo;? This will remove it from all trades and cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3">
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmTag(null)}
                disabled={isSaving}
                className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                disabled={isSaving}
                onClick={() => { if (deleteConfirmTag) void confirmDelete(deleteConfirmTag).then(() => setDeleteConfirmTag(null)); }}
                className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
