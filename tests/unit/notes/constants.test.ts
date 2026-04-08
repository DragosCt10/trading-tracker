import { describe, it, expect } from 'vitest';
import { DEFAULT_STRATEGY_FILTER } from '@/constants/insightVault';

describe('insightVault constants', () => {
  it('DEFAULT_STRATEGY_FILTER equals "all"', () => {
    expect(DEFAULT_STRATEGY_FILTER).toBe('all');
  });
});
