import { useEffect, useMemo, useState } from 'react';
import {
  EARLY_BIRD_INTERVAL_HOURS,
  EARLY_BIRD_LAUNCH_ISO,
  EARLY_BIRD_LIMIT,
  EARLY_BIRD_START_COUNT,
} from '@/constants/earlyBird';

const HOUR_MS = 3_600_000;
const TICK_INTERVAL_MS = 60_000;

export function getSimulatedEarlyBirdSlots(now: Date = new Date()): number {
  const launch = Date.parse(EARLY_BIRD_LAUNCH_ISO);
  if (Number.isNaN(launch)) return EARLY_BIRD_START_COUNT;
  const hoursElapsed = Math.max(0, (now.getTime() - launch) / HOUR_MS);
  const simulated =
    EARLY_BIRD_START_COUNT +
    Math.floor(hoursElapsed / EARLY_BIRD_INTERVAL_HOURS);
  return Math.min(EARLY_BIRD_LIMIT, Math.max(0, simulated));
}

/**
 * Display-only slot count: `max(actual, simulated)`, capped at the limit.
 * Never use this for checkout/eligibility — that must use the real count.
 */
export function getDisplayedEarlyBirdSlots(
  actualSlotsUsed: number,
  now: Date = new Date(),
): number {
  const sim = getSimulatedEarlyBirdSlots(now);
  return Math.min(
    EARLY_BIRD_LIMIT,
    Math.max(0, Math.max(actualSlotsUsed, sim)),
  );
}

/**
 * Client-side hook that returns the displayed slot count and re-evaluates
 * it every minute so the simulated ticker advances without a page reload.
 */
export function useDisplayedEarlyBirdSlots(actualSlotsUsed: number): number {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setTick((t) => t + 1),
      TICK_INTERVAL_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  return useMemo(
    () => getDisplayedEarlyBirdSlots(actualSlotsUsed),
    // `tick` is intentionally a dependency so the memo re-runs on each
    // interval fire even when actualSlotsUsed is unchanged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [actualSlotsUsed, tick],
  );
}
