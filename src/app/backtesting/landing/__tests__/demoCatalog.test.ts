import { describe, it, expect } from 'vitest';
import {
  DEMO_SYMBOLS,
  DEMO_TFS,
  DEFAULT_DEMO_SYMBOL,
  DEFAULT_DEMO_TF,
  DEMO_LOOKBACK_DAYS,
  TIMEFRAME_LABELS,
  demoBarsUrl,
} from '../demoCatalog';

describe('demoCatalog', () => {
  describe('URL builder', () => {
    const FROM = '2026-04-07T00:00:00.000Z';
    const TO = '2026-05-07T00:00:00.000Z';

    it('targets the public OHLC endpoint', () => {
      const url = demoBarsUrl('EURUSD', 'd1', FROM, TO);
      expect(url.startsWith('/api/market-data/ohlc/public?')).toBe(true);
    });

    it('encodes all 4 query params', () => {
      const url = demoBarsUrl('NAS100', 'h4', FROM, TO);
      const params = new URL(url, 'http://localhost').searchParams;
      expect(params.get('symbol')).toBe('NAS100');
      expect(params.get('timeframe')).toBe('h4');
      expect(params.get('from')).toBe(FROM);
      expect(params.get('to')).toBe(TO);
    });
  });

  describe('matrix completeness', () => {
    it('exposes 4 symbols and 3 timeframes', () => {
      expect(DEMO_SYMBOLS).toHaveLength(4);
      expect(DEMO_TFS).toHaveLength(3);
    });

    it('default symbol + timeframe are members of the allowlist', () => {
      expect(DEMO_SYMBOLS).toContain(DEFAULT_DEMO_SYMBOL);
      expect(DEMO_TFS).toContain(DEFAULT_DEMO_TF);
    });

    it('every timeframe has a non-empty display label', () => {
      for (const tf of DEMO_TFS) {
        expect(TIMEFRAME_LABELS[tf]).toBeTypeOf('string');
        expect(TIMEFRAME_LABELS[tf].length).toBeGreaterThan(0);
      }
    });
  });

  describe('lookback window', () => {
    it('stays within the 31-day cap enforced by the public endpoint', () => {
      expect(DEMO_LOOKBACK_DAYS).toBeLessThanOrEqual(31);
      expect(DEMO_LOOKBACK_DAYS).toBeGreaterThan(0);
    });
  });
});
