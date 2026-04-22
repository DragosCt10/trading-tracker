import { useEffect, useMemo, useState } from 'react';
import {
  PROMO_INTERVAL_HOURS,
  PROMO_LAUNCH_ISO,
  PROMO_LIMIT,
  PROMO_START_COUNT,
} from '@/constants/promo';

const HOUR_MS = 3_600_000;
const TICK_INTERVAL_MS = 60_000;

export function getSimulatedPromoSlots(now: Date = new Date()): number {
  const launch = Date.parse(PROMO_LAUNCH_ISO);
  if (Number.isNaN(launch)) return PROMO_START_COUNT;
  const hoursElapsed = Math.max(0, (now.getTime() - launch) / HOUR_MS);
  const simulated =
    PROMO_START_COUNT +
    Math.floor(hoursElapsed / PROMO_INTERVAL_HOURS);
  return Math.min(PROMO_LIMIT, Math.max(0, simulated));
}

/**
 * Display-only slot count: `max(actual, simulated)`, capped at the limit.
 * Never use this for checkout/eligibility — that must use the real count.
 */
export function getDisplayedPromoSlots(
  actualSlotsUsed: number,
  now: Date = new Date(),
): number {
  const sim = getSimulatedPromoSlots(now);
  return Math.min(
    PROMO_LIMIT,
    Math.max(0, Math.max(actualSlotsUsed, sim)),
  );
}

/**
 * Client-side hook that returns the displayed slot count and re-evaluates
 * it every minute so the simulated ticker advances without a page reload.
 */
export function useDisplayedPromoSlots(actualSlotsUsed: number): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setTick((t) => t + 1),
      TICK_INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  return useMemo(
    () => getDisplayedPromoSlots(actualSlotsUsed),
    // `tick` is intentionally a dependency so the memo re-runs on each
    // interval fire even when actualSlotsUsed is unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actualSlotsUsed, tick],
  );
}
