import { describe, it, expect } from 'vitest';
import {
  buildCanonicalPayload,
  buildReferenceCode,
  sha256Hex,
} from '@/lib/tradeLedger/integrityHash';
import { defaultReportConfig } from '@/lib/tradeLedger/reportConfig';

const FIXED_DATE = new Date('2026-04-18T14:30:00Z');

function makeConfig() {
  return defaultReportConfig(
    '550e8400-e29b-41d4-a716-446655440000',
    'live',
    { start: '2026-04-01', end: '2026-04-18' },
  );
}

describe('buildCanonicalPayload', () => {
  it('produces identical strings for identical inputs', () => {
    const cfg = makeConfig();
    const ids = ['t-3', 't-1', 't-2'];
    const a = buildCanonicalPayload(cfg, ids, FIXED_DATE);
    const b = buildCanonicalPayload(cfg, ids, FIXED_DATE);
    expect(a).toBe(b);
  });

  it('sorts tradeIds ascending regardless of input order', () => {
    const cfg = makeConfig();
    const a = buildCanonicalPayload(cfg, ['t-3', 't-1', 't-2'], FIXED_DATE);
    const b = buildCanonicalPayload(cfg, ['t-1', 't-2', 't-3'], FIXED_DATE);
    expect(a).toBe(b);
  });

  it('produces a different string when tradeIds differ', () => {
    const cfg = makeConfig();
    const a = buildCanonicalPayload(cfg, ['t-1', 't-2'], FIXED_DATE);
    const b = buildCanonicalPayload(cfg, ['t-1', 't-3'], FIXED_DATE);
    expect(a).not.toBe(b);
  });

  it('produces a different string when config changes', () => {
    const cfg1 = makeConfig();
    const cfg2 = { ...cfg1, period: { start: '2026-04-02', end: '2026-04-18' } };
    const ids = ['t-1'];
    expect(buildCanonicalPayload(cfg1, ids, FIXED_DATE)).not.toBe(
      buildCanonicalPayload(cfg2, ids, FIXED_DATE),
    );
  });

  it('is stable across key-order permutations in the config', () => {
    const cfg = makeConfig();
    // Rebuild the same config object with keys inserted in reverse order.
    // Canonical serialization must still yield the same bytes. Building
    // dynamically from the source keeps this test future-proof when new
    // fields are added to ReportConfig.
    const reordered = Object.fromEntries(
      Object.entries(cfg).reverse(),
    ) as typeof cfg;
    expect(buildCanonicalPayload(cfg, ['t-1'], FIXED_DATE)).toBe(
      buildCanonicalPayload(reordered, ['t-1'], FIXED_DATE),
    );
  });
});

describe('sha256Hex', () => {
  it('produces the canonical SHA-256 hex for a known string', async () => {
    // `echo -n "hello" | shasum -a 256` → 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(await sha256Hex('hello')).toBe(
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    );
  });

  it('returns the same digest for the same input', async () => {
    const a = await sha256Hex('alpha stats');
    const b = await sha256Hex('alpha stats');
    expect(a).toBe(b);
  });

  it('returns different digests for different inputs', async () => {
    const a = await sha256Hex('alpha stats');
    const b = await sha256Hex('Alpha Stats');
    expect(a).not.toBe(b);
  });
});

describe('buildReferenceCode', () => {
  it('formats as TL-YYYYMMDD-NNN-XXXXXXXX', () => {
    const code = buildReferenceCode('deadbeefcafefood', FIXED_DATE, 1);
    expect(code).toBe('TL-20260418-001-DEADBEEF');
  });

  it('zero-pads the sequence', () => {
    expect(buildReferenceCode('abcdef12', FIXED_DATE, 42)).toBe(
      'TL-20260418-042-ABCDEF12',
    );
  });
});
