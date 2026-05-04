import { describe, it, expect } from 'vitest';
import { formatTradeTimeForDisplay } from '@/utils/formatTradeTime';

describe('formatTradeTimeForDisplay', () => {
  it('passes through HH:MM strings unchanged', () => {
    expect(formatTradeTimeForDisplay('08:00')).toBe('08:00');
    expect(formatTradeTimeForDisplay('10:24')).toBe('10:24');
  });

  it('strips seconds from HH:MM:SS strings (DB Time(6) round-trip)', () => {
    expect(formatTradeTimeForDisplay('10:24:00')).toBe('10:24');
    expect(formatTradeTimeForDisplay('23:59:59')).toBe('23:59');
  });

  it('extracts HH:MM:SS from ISO timestamp strings', () => {
    expect(formatTradeTimeForDisplay('2026-04-24T10:24:00Z')).toBe('10:24:00');
  });

  it('extracts HH:MM:SS from Date instances', () => {
    expect(formatTradeTimeForDisplay(new Date('2026-04-24T10:24:00Z'))).toBe('10:24:00');
  });

  it('returns empty string for null/undefined', () => {
    expect(formatTradeTimeForDisplay(null)).toBe('');
    expect(formatTradeTimeForDisplay(undefined)).toBe('');
  });

  it('coerces unknown shapes via String()', () => {
    expect(formatTradeTimeForDisplay(123)).toBe('123');
  });
});
