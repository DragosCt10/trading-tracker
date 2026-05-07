import { describe, it, expect } from 'vitest';
import { resampleByMinutes, resampleToWeekly } from '@/lib/marketData/resampler';
import type { OhlcBar } from '@/lib/marketData/types';

const MIN = 60;

function bar(time: number, o: number, h: number, l: number, c: number, v = 1): OhlcBar {
  return { time, open: o, high: h, low: l, close: c, volume: v };
}

describe('resampleByMinutes', () => {
  it('groups m1 bars into m2 buckets anchored to UTC midnight', () => {
    // Three consecutive m1 bars at 00:00, 00:01, 00:02 → two m2 buckets.
    const bars: OhlcBar[] = [
      bar(0,        100, 110, 95,  108),
      bar(MIN,      108, 115, 105, 112),
      bar(2 * MIN,  112, 120, 110, 118),
    ];
    const out = resampleByMinutes(bars, 2);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ time: 0, open: 100, high: 115, low: 95, close: 112, volume: 2 });
    expect(out[1]).toMatchObject({ time: 2 * MIN, open: 112, high: 120, low: 110, close: 118, volume: 1 });
  });

  it('m3 buckets — 5 bars produce 2 buckets (3 + 2)', () => {
    const bars: OhlcBar[] = [
      bar(0,        100, 105, 99,  103),
      bar(1 * MIN,  103, 108, 102, 107),
      bar(2 * MIN,  107, 110, 106, 109),
      bar(3 * MIN,  109, 112, 108, 111),
      bar(4 * MIN,  111, 113, 110, 112),
    ];
    const out = resampleByMinutes(bars, 3);
    expect(out).toHaveLength(2);
    expect(out[0].time).toBe(0);
    expect(out[0].high).toBe(110);
    expect(out[0].low).toBe(99);
    expect(out[0].close).toBe(109);
    expect(out[1].time).toBe(3 * MIN);
    expect(out[1].close).toBe(112);
  });

  it('m4 buckets', () => {
    const bars: OhlcBar[] = [];
    for (let i = 0; i < 8; i++) {
      bars.push(bar(i * MIN, 100 + i, 101 + i, 99 + i, 100 + i));
    }
    const out = resampleByMinutes(bars, 4);
    expect(out).toHaveLength(2);
    expect(out[0].time).toBe(0);
    expect(out[1].time).toBe(4 * MIN);
  });

  it('passes through unchanged when n=1 (degenerate)', () => {
    const bars: OhlcBar[] = [bar(0, 1, 2, 0, 1)];
    // 1 isn't a valid n in the type signature but the runtime guard handles it.
    expect(resampleByMinutes(bars, 2 as 2)).toHaveLength(1);
  });

  it('returns empty for empty input', () => {
    expect(resampleByMinutes([], 2)).toEqual([]);
  });

  it('handles gaps — bucket boundaries align to grid, not bar order', () => {
    // Bar at 00:01 (in bucket [0,2)) then a gap, then 00:05 (in bucket [4,6)).
    const bars: OhlcBar[] = [
      bar(MIN,     100, 105, 99,  103),
      bar(5 * MIN, 110, 115, 108, 112),
    ];
    const out = resampleByMinutes(bars, 2);
    expect(out).toHaveLength(2);
    expect(out[0].time).toBe(0);    // bucket [0,2)
    expect(out[1].time).toBe(4 * MIN); // bucket [4,6)
  });
});

describe('resampleToWeekly', () => {
  // 1970-01-05 was a Monday → unix 4 * 86400 = 345600.
  const MON_EPOCH = 4 * 86400;
  const DAY = 86400;
  const WEEK = 7 * DAY;

  it('groups daily bars into ISO weeks anchored on Monday', () => {
    // Mon, Tue, Wed of one week
    const bars: OhlcBar[] = [
      bar(MON_EPOCH,            100, 110, 95,  108),
      bar(MON_EPOCH + DAY,      108, 115, 105, 112),
      bar(MON_EPOCH + 2 * DAY,  112, 120, 110, 118),
    ];
    const out = resampleToWeekly(bars);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ time: MON_EPOCH, open: 100, high: 120, low: 95, close: 118 });
  });

  it('two weeks → two output bars', () => {
    const bars: OhlcBar[] = [
      bar(MON_EPOCH,            100, 110, 95,  108),
      bar(MON_EPOCH + WEEK,     108, 115, 105, 112),
    ];
    const out = resampleToWeekly(bars);
    expect(out).toHaveLength(2);
    expect(out[0].time).toBe(MON_EPOCH);
    expect(out[1].time).toBe(MON_EPOCH + WEEK);
  });

  it('returns empty for empty input', () => {
    expect(resampleToWeekly([])).toEqual([]);
  });
});
