'use client';

import { useState } from 'react';
import { Copy, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ShareLinkRowProps {
  /** Primary label (top line) — e.g. "2026-01-01 ~ 2026-01-31" for strategy shares, "EURUSD LONG · 2026-03-15" for trade shares. */
  primaryLabel: string;
  /** Secondary line — typically `Created {date}`. */
  secondaryLabel: string;
  /** Full copyable URL including origin + any theme query string. */
  shareUrl: string;
  /** Current active state of the share link. */
  active: boolean;
  /** Handler invoked when the user toggles the active switch. */
  onToggleActive: () => void | Promise<void>;
  /** Handler invoked when the user clicks the delete icon. */
  onDelete: () => void | Promise<void>;
  /** True while the toggle request is in-flight. */
  isRevoking?: boolean;
  /** True while the delete request is in-flight. */
  isDeleting?: boolean;
}

/**
 * Share-link row with Copy / Toggle-active / Delete controls.
 *
 * Used by ShareStrategyModal (existing), ShareTradeModal (new) and SharedTradesPanel
 * (new Settings tab). Owns its own "Copied!" animation state — parents pass handlers
 * for toggle and delete, plus a fully-constructed URL that the row copies to the
 * clipboard.
 */
export function ShareLinkRow({
  primaryLabel,
  secondaryLabel,
  shareUrl,
  active,
  onToggleActive,
  onDelete,
  isRevoking = false,
  isDeleting = false,
}: ShareLinkRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may be blocked in insecure contexts — fail silently, same
      // as the existing ShareStrategyModal pattern.
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/70 dark:bg-slate-900/40 px-3 py-2">
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
          {primaryLabel}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {secondaryLabel}
        </span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 h-7 px-2.5 text-xs font-medium gap-1.5"
          title="Copy share link"
        >
          {copied ? (
            'Copied!'
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </>
          )}
        </Button>
        <button
          type="button"
          onClick={onToggleActive}
          disabled={isRevoking || isDeleting}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer border',
            active
              ? 'bg-emerald-500/90 border-emerald-400/80'
              : 'bg-slate-500/40 border-slate-400/60',
            (isRevoking || isDeleting) && 'opacity-60 cursor-wait'
          )}
          aria-label={active ? 'Disable public link' : 'Enable public link'}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
              active ? 'translate-x-[22px]' : 'translate-x-[4px]'
            )}
          />
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isDeleting || isRevoking}
          className="h-7 w-7 cursor-pointer rounded-full text-[11px] text-slate-500 hover:text-slate-600 hover:bg-slate-500/10 disabled:opacity-60"
          aria-label="Delete share link"
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </Button>
      </div>
    </div>
  );
}
