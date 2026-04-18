import { describe, it, expect } from 'vitest';
import {
  baseReportConfigSchema,
  createReportConfigSchema,
  defaultReportConfig,
  type AccountCurrencyRecord,
} from '@/lib/tradeLedger/reportConfig';

// Valid RFC 4122 v4 UUIDs for tests.
const UUID_A = '550e8400-e29b-41d4-a716-446655440000';
const UUID_B = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const UUID_C = '6ba7b811-9dad-41d1-80b4-00c04fd430c8';

const accountsById: Record<string, AccountCurrencyRecord> = {
  [UUID_A]: { id: UUID_A, currency: 'USD' },
  [UUID_B]: { id: UUID_B, currency: 'USD' },
  [UUID_C]: { id: UUID_C, currency: 'EUR' },
};

function makeConfig() {
  return defaultReportConfig(UUID_A, 'live', {
    start: '2026-04-01',
    end: '2026-04-18',
  });
}

describe('baseReportConfigSchema', () => {
  it('accepts a valid default config', () => {
    const res = baseReportConfigSchema.safeParse(makeConfig());
    expect(res.success).toBe(true);
  });

  it('rejects a reversed period (end before start)', () => {
    const bad = { ...makeConfig(), period: { start: '2026-04-18', end: '2026-04-01' } };
    const res = baseReportConfigSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it('rejects empty accountIds', () => {
    const bad = { ...makeConfig(), accountIds: [] };
    const res = baseReportConfigSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it('rejects invalid mode', () => {
    const bad = { ...makeConfig(), mode: 'futures' } as unknown as ReturnType<typeof makeConfig>;
    const res = baseReportConfigSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it('rejects non-UUID accountIds', () => {
    const bad = { ...makeConfig(), accountIds: ['not-a-uuid'] };
    const res = baseReportConfigSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it('rejects footerNotes longer than 500 characters', () => {
    const cfg = makeConfig();
    cfg.sections.footerNotes = 'x'.repeat(501);
    const res = baseReportConfigSchema.safeParse(cfg);
    expect(res.success).toBe(false);
  });
});

describe('createReportConfigSchema — mixed-currency refine', () => {
  it('accepts a single account', () => {
    const schema = createReportConfigSchema(accountsById);
    const cfg = makeConfig();
    expect(schema.safeParse(cfg).success).toBe(true);
  });

  it('accepts multiple same-currency accounts', () => {
    const schema = createReportConfigSchema(accountsById);
    const cfg = { ...makeConfig(), accountIds: [UUID_A, UUID_B] };
    expect(schema.safeParse(cfg).success).toBe(true);
  });

  it('rejects mixed-currency selection with a readable error', () => {
    const schema = createReportConfigSchema(accountsById);
    const cfg = { ...makeConfig(), accountIds: [UUID_A, UUID_C] };
    const res = schema.safeParse(cfg);
    expect(res.success).toBe(false);
    if (!res.success) {
      const message = res.error.issues[0]?.message ?? '';
      expect(message).toMatch(/currency/i);
    }
  });

  it('rejects unknown accountIds', () => {
    const schema = createReportConfigSchema(accountsById);
    const cfg = { ...makeConfig(), accountIds: ['44444444-4444-4444-4444-444444444444'] };
    const res = schema.safeParse(cfg);
    expect(res.success).toBe(false);
  });
});
