import { describe, expect, it } from 'vitest';
import { isFuturesAccount } from '@/utils/account-helpers';

describe('isFuturesAccount', () => {
  it('returns true for futures', () => {
    expect(isFuturesAccount({ account_type: 'futures' })).toBe(true);
  });

  it('returns false for standard', () => {
    expect(isFuturesAccount({ account_type: 'standard' })).toBe(false);
  });

  it('returns false for legacy null/undefined', () => {
    expect(isFuturesAccount({ account_type: null })).toBe(false);
    expect(isFuturesAccount({ account_type: undefined })).toBe(false);
    expect(isFuturesAccount({})).toBe(false);
    expect(isFuturesAccount(null)).toBe(false);
    expect(isFuturesAccount(undefined)).toBe(false);
  });
});
