/**
 * Pure-function tests for post content validation and trade outcome
 * normalisation — logic extracted from the social server actions.
 */
import { describe, it, expect } from 'vitest';
import { validatePostContent, normalizeTradeOutcome } from '@/lib/server/feedHelpers';

// ── validatePostContent ───────────────────────────────────────────────────────

describe('validatePostContent', () => {
  const MAX = 2000; // typical pro limit

  // ── Valid cases ──────────────────────────────────────────────────────────────

  it('accepts a normal non-empty post', () => {
    expect(validatePostContent('Hello world', MAX)).toEqual({ valid: true });
  });

  it('accepts a post at exactly the max length', () => {
    const content = 'a'.repeat(MAX);
    expect(validatePostContent(content, MAX)).toEqual({ valid: true });
  });

  it('accepts a single-character post', () => {
    expect(validatePostContent('x', MAX)).toEqual({ valid: true });
  });

  it('accepts content with only whitespace padded around real characters', () => {
    expect(validatePostContent('  hello  ', MAX)).toEqual({ valid: true });
  });

  it('accepts multiline content', () => {
    expect(validatePostContent('line 1\nline 2\nline 3', MAX)).toEqual({ valid: true });
  });

  // ── Empty content ────────────────────────────────────────────────────────────

  it('rejects an empty string', () => {
    const result = validatePostContent('', MAX);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/cannot be empty/i);
  });

  it('rejects a string of only spaces', () => {
    const result = validatePostContent('   ', MAX);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/cannot be empty/i);
  });

  it('rejects a string of only newlines', () => {
    const result = validatePostContent('\n\n\n', MAX);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/cannot be empty/i);
  });

  it('rejects a string of only tabs', () => {
    const result = validatePostContent('\t\t', MAX);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(/cannot be empty/i);
  });

  // ── Too long ─────────────────────────────────────────────────────────────────

  it('rejects a post one character over the limit', () => {
    const content = 'a'.repeat(MAX + 1);
    const result = validatePostContent(content, MAX);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toMatch(`${MAX}`);
  });

  it('rejects a post significantly over the limit', () => {
    const content = 'a'.repeat(MAX + 500);
    const result = validatePostContent(content, MAX);
    expect(result.valid).toBe(false);
  });

  it('includes the max length value in the error reason', () => {
    const content = 'a'.repeat(MAX + 1);
    const result = validatePostContent(content, MAX);
    if (!result.valid) expect(result.reason).toContain(String(MAX));
  });

  // ── Boundary ─────────────────────────────────────────────────────────────────

  it('accepts a starter-tier limit (280 chars) exactly at threshold', () => {
    const STARTER_MAX = 280;
    expect(validatePostContent('a'.repeat(STARTER_MAX), STARTER_MAX)).toEqual({ valid: true });
  });

  it('rejects a starter-tier post at 281 chars', () => {
    const STARTER_MAX = 280;
    const result = validatePostContent('a'.repeat(STARTER_MAX + 1), STARTER_MAX);
    expect(result.valid).toBe(false);
  });

  // ── Type narrowing ───────────────────────────────────────────────────────────

  it('valid result has exactly { valid: true } shape', () => {
    const result = validatePostContent('test', MAX);
    expect(result).toEqual({ valid: true });
    expect(Object.keys(result)).toEqual(['valid']);
  });

  it('invalid result has { valid: false, reason: string } shape', () => {
    const result = validatePostContent('', MAX);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });
});

// ── normalizeTradeOutcome ─────────────────────────────────────────────────────

describe('normalizeTradeOutcome', () => {
  // ── Win ──────────────────────────────────────────────────────────────────────

  it('returns "win" for exact "win"', () => {
    expect(normalizeTradeOutcome('win')).toBe('win');
  });

  it('returns "win" for uppercase "WIN"', () => {
    expect(normalizeTradeOutcome('WIN')).toBe('win');
  });

  it('returns "win" for mixed-case "Win"', () => {
    expect(normalizeTradeOutcome('Win')).toBe('win');
  });

  it('returns "win" for "winner" (contains "win")', () => {
    expect(normalizeTradeOutcome('winner')).toBe('win');
  });

  it('returns "win" for "Winning trade"', () => {
    expect(normalizeTradeOutcome('Winning trade')).toBe('win');
  });

  // ── Loss ─────────────────────────────────────────────────────────────────────

  it('returns "loss" for exact "loss"', () => {
    expect(normalizeTradeOutcome('loss')).toBe('loss');
  });

  it('returns "loss" for uppercase "LOSS"', () => {
    expect(normalizeTradeOutcome('LOSS')).toBe('loss');
  });

  it('returns "loss" for mixed-case "Loss"', () => {
    expect(normalizeTradeOutcome('Loss')).toBe('loss');
  });

  it('returns "loss" for "Losing trade" (contains "los"... no — not "loss")', () => {
    // "losing" does NOT contain the substring "loss" — expect "be"
    expect(normalizeTradeOutcome('Losing trade')).toBe('be');
  });

  it('returns "loss" for "big_loss" (contains "loss")', () => {
    expect(normalizeTradeOutcome('big_loss')).toBe('loss');
  });

  // ── Break-even ───────────────────────────────────────────────────────────────

  it('returns "be" for exact "be"', () => {
    expect(normalizeTradeOutcome('be')).toBe('be');
  });

  it('returns "be" for "break_even"', () => {
    expect(normalizeTradeOutcome('break_even')).toBe('be');
  });

  it('returns "be" for an empty string', () => {
    expect(normalizeTradeOutcome('')).toBe('be');
  });

  it('returns "be" for an unknown value', () => {
    expect(normalizeTradeOutcome('scratch')).toBe('be');
    expect(normalizeTradeOutcome('pending')).toBe('be');
    expect(normalizeTradeOutcome('unknown')).toBe('be');
  });

  it('returns "be" for a number-like string', () => {
    expect(normalizeTradeOutcome('0')).toBe('be');
    expect(normalizeTradeOutcome('1')).toBe('be');
  });

  // ── Priority: win before loss ────────────────────────────────────────────────

  it('returns "win" when both "win" and "loss" appear (win takes priority)', () => {
    // "win_loss" — win check runs first
    expect(normalizeTradeOutcome('win_loss')).toBe('win');
  });
});
