import { SCREEN_TIMEFRAME_PRESET_OPTIONS } from '@/constants/tradeFormOptions';

export function snapToHalfStep(num: number): number {
  return Math.round(num * 2) / 2;
}

export function formatPotentialRR(val: number | undefined | null): string {
  if (val == null || Number.isNaN(Number(val))) return '—';
  const n = Number(val);
  return n === 10.5 ? '10+' : n.toFixed(2);
}

export function shouldClearScreenTimeframeOnOutsideBlur(
  timeframeRaw: string,
  screenUrlRaw: string
): boolean {
  const currentTf = (timeframeRaw ?? '').trim();
  const currentUrl = (screenUrlRaw ?? '').trim();

  if (currentUrl !== '') return false;
  if (currentTf === '') return false;

  const isPresetTf = SCREEN_TIMEFRAME_PRESET_OPTIONS.includes(
    currentTf as (typeof SCREEN_TIMEFRAME_PRESET_OPTIONS)[number]
  );

  // Keep concrete custom values (e.g. 10s, 2H) when focus leaves.
  if (currentTf !== 'Custom' && !isPresetTf) return false;

  return true;
}

