import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/queryKeys';

describe('queryKeys.notes', () => {
  it('returns ["notes", userId, strategyId] with both params', () => {
    expect(queryKeys.notes('user-1', 'strat-1')).toEqual(['notes', 'user-1', 'strat-1']);
  });

  it('returns ["notes", undefined, undefined] with no params', () => {
    expect(queryKeys.notes()).toEqual(['notes', undefined, undefined]);
  });
});

describe('queryKeys.tradesForNoteLinking', () => {
  it('returns correct array with all params', () => {
    const result = queryKeys.tradesForNoteLinking('user-1', 'live', 'acc-1', ['s1', 's2']);
    expect(result).toEqual(['tradesForNoteLinking', 'user-1', 'live', 'acc-1', ['s1', 's2']]);
  });

  it('includes strategyIds array in the key', () => {
    const key = queryKeys.tradesForNoteLinking('u', 'm', 'a', ['x']);
    expect(key[4]).toEqual(['x']);
  });
});
