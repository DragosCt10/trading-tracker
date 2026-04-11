/**
 * Pure-function tests for the feed date utility functions in feedHelpers.ts.
 * These functions drive rate-limit windows (weekly post cap, daily post cap).
 * All tests are deterministic by inspecting structural properties rather than
 * relying on the exact current time.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextMondayUtc, currentWeekMondayUtc, todayUtc } from '@/lib/server/feedHelpers';

// ── todayUtc ──────────────────────────────────────────────────────────────────

describe('todayUtc', () => {
  it('returns a Date object', () => {
    expect(todayUtc()).toBeInstanceOf(Date);
  });

  it('has UTC hours set to 00:00:00.000', () => {
    const d = todayUtc();
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
    expect(d.getUTCMilliseconds()).toBe(0);
  });

  it('is not in the future', () => {
    expect(todayUtc().getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('is within the last 24 hours', () => {
    const oneDayMs = 24 * 60 * 60 * 1000;
    expect(Date.now() - todayUtc().getTime()).toBeLessThan(oneDayMs);
  });

  it('uses UTC date components matching the current UTC day', () => {
    const d = todayUtc();
    const now = new Date();
    expect(d.getUTCFullYear()).toBe(now.getUTCFullYear());
    expect(d.getUTCMonth()).toBe(now.getUTCMonth());
    expect(d.getUTCDate()).toBe(now.getUTCDate());
  });
});

// ── currentWeekMondayUtc ──────────────────────────────────────────────────────

describe('currentWeekMondayUtc', () => {
  it('returns a Date object', () => {
    expect(currentWeekMondayUtc()).toBeInstanceOf(Date);
  });

  it('has UTC hours set to 00:00:00.000', () => {
    const d = currentWeekMondayUtc();
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
    expect(d.getUTCMilliseconds()).toBe(0);
  });

  it('returns a day with UTC day = 1 (Monday)', () => {
    expect(currentWeekMondayUtc().getUTCDay()).toBe(1);
  });

  it('is on or before today', () => {
    expect(currentWeekMondayUtc().getTime()).toBeLessThanOrEqual(todayUtc().getTime());
  });

  it('is at most 6 days before today', () => {
    const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
    expect(todayUtc().getTime() - currentWeekMondayUtc().getTime())
      .toBeLessThanOrEqual(sixDaysMs);
  });

  it('returns the correct Monday when called on a known Wednesday', () => {
    // 2024-04-10 is a Wednesday UTC.
    vi.setSystemTime(new Date('2024-04-10T14:00:00.000Z'));
    const monday = currentWeekMondayUtc();
    expect(monday.toISOString()).toBe('2024-04-08T00:00:00.000Z'); // previous Monday
    vi.useRealTimers();
  });

  it('returns itself when called on a Monday', () => {
    // 2024-04-08 is a Monday UTC.
    vi.setSystemTime(new Date('2024-04-08T09:30:00.000Z'));
    const monday = currentWeekMondayUtc();
    expect(monday.toISOString()).toBe('2024-04-08T00:00:00.000Z');
    vi.useRealTimers();
  });

  it('returns the correct Monday when called on a Sunday', () => {
    // 2024-04-14 is a Sunday UTC.
    vi.setSystemTime(new Date('2024-04-14T23:00:00.000Z'));
    const monday = currentWeekMondayUtc();
    expect(monday.toISOString()).toBe('2024-04-08T00:00:00.000Z');
    vi.useRealTimers();
  });
});

// ── nextMondayUtc ─────────────────────────────────────────────────────────────

describe('nextMondayUtc', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns a Date object', () => {
    expect(nextMondayUtc()).toBeInstanceOf(Date);
  });

  it('has UTC hours set to 00:00:00.000', () => {
    const d = nextMondayUtc();
    expect(d.getUTCHours()).toBe(0);
    expect(d.getUTCMinutes()).toBe(0);
    expect(d.getUTCSeconds()).toBe(0);
    expect(d.getUTCMilliseconds()).toBe(0);
  });

  it('returns a day with UTC day = 1 (Monday)', () => {
    expect(nextMondayUtc().getUTCDay()).toBe(1);
  });

  it('is strictly after today', () => {
    expect(nextMondayUtc().getTime()).toBeGreaterThan(todayUtc().getTime());
  });

  it('is at most 7 days in the future', () => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(nextMondayUtc().getTime() - Date.now()).toBeLessThanOrEqual(sevenDaysMs);
  });

  it('returns next Monday from a known Wednesday', () => {
    // 2024-04-10 is a Wednesday UTC.
    vi.setSystemTime(new Date('2024-04-10T14:00:00.000Z'));
    expect(nextMondayUtc().toISOString()).toBe('2024-04-15T00:00:00.000Z');
  });

  it('returns next Monday from a Monday (i.e. 7 days forward)', () => {
    // 2024-04-08 is a Monday UTC — next Monday is 7 days later.
    vi.setSystemTime(new Date('2024-04-08T09:30:00.000Z'));
    expect(nextMondayUtc().toISOString()).toBe('2024-04-15T00:00:00.000Z');
  });

  it('returns the coming Monday from a Sunday', () => {
    // 2024-04-14 is a Sunday UTC — next Monday is tomorrow.
    vi.setSystemTime(new Date('2024-04-14T23:00:00.000Z'));
    expect(nextMondayUtc().toISOString()).toBe('2024-04-15T00:00:00.000Z');
  });

  it('returns the coming Monday from a Saturday', () => {
    // 2024-04-13 is a Saturday UTC — next Monday is in 2 days.
    vi.setSystemTime(new Date('2024-04-13T10:00:00.000Z'));
    expect(nextMondayUtc().toISOString()).toBe('2024-04-15T00:00:00.000Z');
  });

  it('returns the coming Monday from a Tuesday', () => {
    // 2024-04-09 is a Tuesday — next Monday is in 6 days.
    vi.setSystemTime(new Date('2024-04-09T00:00:00.000Z'));
    expect(nextMondayUtc().toISOString()).toBe('2024-04-15T00:00:00.000Z');
  });

  it('nextMondayUtc is always one week after currentWeekMondayUtc when measured on Monday', () => {
    vi.setSystemTime(new Date('2024-04-08T06:00:00.000Z'));
    const weekStart = currentWeekMondayUtc().getTime();
    const nextWeek  = nextMondayUtc().getTime();
    expect(nextWeek - weekStart).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
