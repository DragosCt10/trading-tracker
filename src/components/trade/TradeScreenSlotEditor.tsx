'use client';

import type { RefCallback } from 'react';
import { Input } from '@/components/ui/input';
import {
  SCREEN_TIMEFRAME_OPTIONS,
  SCREEN_TIMEFRAME_PRESET_OPTIONS,
} from '@/constants/tradeFormOptions';
import { normalizeCustomTradeScreenTimeframe } from '@/utils/normalizeCustomTradeScreenTimeframe';
import { shouldClearScreenTimeframeOnOutsideBlur } from '@/utils/tradeFormHelpers';

interface TradeScreenSlotEditorProps {
  index: number;
  label: string;
  timeframe: string;
  screenUrl: string;
  onTimeframeChange: (nextTimeframe: string) => void;
  onScreenUrlChange: (nextUrl: string) => void;
  urlInputId?: string;
  labelClassName: string;
  wrapperClassName?: string;
  labelRowClassName?: string;
  chipsClassName?: string;
  chipActiveClassName: string;
  chipIdleClassName?: string;
  customInputClassName: string;
  customInputRef?: RefCallback<HTMLInputElement>;
  urlInputClassName: string;
  showOpenLink?: boolean;
}

const DEFAULT_CHIP_IDLE_CLASS =
  'border-slate-300/60 dark:border-slate-700/70 bg-slate-100/40 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300 hover:border-slate-400/70 dark:hover:border-slate-600/70';

export function TradeScreenSlotEditor({
  index,
  label,
  timeframe,
  screenUrl,
  onTimeframeChange,
  onScreenUrlChange,
  urlInputId,
  labelClassName,
  wrapperClassName,
  labelRowClassName,
  chipsClassName,
  chipActiveClassName,
  chipIdleClassName = DEFAULT_CHIP_IDLE_CLASS,
  customInputClassName,
  customInputRef,
  urlInputClassName,
  showOpenLink = false,
}: TradeScreenSlotEditorProps) {
  const currentTf = (timeframe ?? '').trim();
  const currentUrl = screenUrl ?? '';
  const isCustomTf =
    currentTf !== '' &&
    !SCREEN_TIMEFRAME_PRESET_OPTIONS.includes(
      currentTf as (typeof SCREEN_TIMEFRAME_PRESET_OPTIONS)[number]
    );

  return (
    <div
      className={wrapperClassName}
      onBlurCapture={(e) => {
        const nextFocused = e.relatedTarget as Node | null;
        if (nextFocused && e.currentTarget.contains(nextFocused)) return;
        if (!shouldClearScreenTimeframeOnOutsideBlur(currentTf, currentUrl)) return;
        onTimeframeChange('');
      }}
    >
      <div className={labelRowClassName ?? 'flex flex-wrap items-center justify-between gap-2'}>
        <label htmlFor={urlInputId} className={labelClassName}>
          {label}
        </label>
        <div className={chipsClassName ?? 'flex flex-wrap items-center gap-1.5'}>
          {SCREEN_TIMEFRAME_OPTIONS.map((tf) => (
            <button
              key={`${index}-${tf}`}
              type="button"
              onClick={() => {
                if (tf === 'Custom') {
                  onTimeframeChange(isCustomTf ? currentTf : 'Custom');
                  return;
                }
                onTimeframeChange(tf);
              }}
              className={`h-7 px-2 rounded-md border text-[11px] font-semibold transition-colors cursor-pointer ${
                (tf === 'Custom' && (currentTf === 'Custom' || isCustomTf)) || currentTf === tf
                  ? chipActiveClassName
                  : chipIdleClassName
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {(currentTf === 'Custom' || isCustomTf) && (
        <Input
          ref={customInputRef}
          type="text"
          value={currentTf === 'Custom' ? '' : currentTf}
          onChange={(e) => onTimeframeChange(e.target.value)}
          onBlur={(e) => {
            const normalized = normalizeCustomTradeScreenTimeframe(e.target.value);
            if (normalized === '' || normalized === null) {
              onTimeframeChange('');
              return;
            }
            onTimeframeChange(normalized);
          }}
          className={customInputClassName}
          placeholder="Custom TF (e.g. 2H)"
        />
      )}

      <div className={showOpenLink ? 'flex items-center gap-2' : undefined}>
        <Input
          id={urlInputId}
          type="url"
          value={currentUrl}
          onChange={(e) => onScreenUrlChange(e.target.value)}
          className={urlInputClassName}
          placeholder="https://..."
        />
        {showOpenLink && currentUrl && (currentUrl.startsWith('http://') || currentUrl.startsWith('https://')) && (
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-sm font-medium text-slate-900 dark:text-slate-100 underline"
          >
            Open
          </a>
        )}
      </div>
    </div>
  );
}

