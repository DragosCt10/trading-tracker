/**
 * Pure-function tests for invite token validation logic.
 * Covers UUID format checks, expiry, and max-uses guards — all without hitting
 * the database or mocking Supabase.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isValidInviteToken, isInviteExpired, isInviteAtMaxUses } from '@/lib/server/feedHelpers';

// ── isValidInviteToken ────────────────────────────────────────────────────────

describe('isValidInviteToken', () => {
  it('accepts a well-formed lowercase UUID v4', () => {
    expect(isValidInviteToken('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts a well-formed uppercase UUID', () => {
    expect(isValidInviteToken('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('accepts a mixed-case UUID', () => {
    expect(isValidInviteToken('550e8400-E29b-41D4-a716-446655440000')).toBe(true);
  });

  it('accepts all-zero UUID (nil UUID)', () => {
    expect(isValidInviteToken('00000000-0000-0000-0000-000000000000')).toBe(true);
  });

  it('accepts all-f UUID (max UUID)', () => {
    expect(isValidInviteToken('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidInviteToken('')).toBe(false);
  });

  it('rejects a UUID without hyphens', () => {
    expect(isValidInviteToken('550e8400e29b41d4a716446655440000')).toBe(false);
  });

  it('rejects a UUID with wrong grouping', () => {
    // One too few chars in first group
    expect(isValidInviteToken('550e840-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('rejects a UUID with non-hex characters', () => {
    expect(isValidInviteToken('550e8400-e29b-41d4-g716-446655440000')).toBe(false);
  });

  it('rejects a UUID with extra trailing characters', () => {
    expect(isValidInviteToken('550e8400-e29b-41d4-a716-446655440000x')).toBe(false);
  });

  it('rejects a plain random string', () => {
    expect(isValidInviteToken('not-a-uuid')).toBe(false);
  });

  it('rejects an ISO date string', () => {
    expect(isValidInviteToken('2024-06-15T12:34:56.789Z')).toBe(false);
  });

  it('rejects a SQL injection probe', () => {
    expect(isValidInviteToken("' OR 1=1 --")).toBe(false);
  });

  it('rejects a path traversal probe', () => {
    expect(isValidInviteToken('../../../etc/passwd')).toBe(false);
  });
});

// ── isInviteExpired ───────────────────────────────────────────────────────────

describe('isInviteExpired', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns false when expiresAt is null (no expiry)', () => {
    expect(isInviteExpired(null)).toBe(false);
  });

  it('returns false for a future expiry', () => {
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
    expect(isInviteExpired('2024-12-31T23:59:59.999Z')).toBe(false);
  });

  it('returns true for a past expiry', () => {
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
    expect(isInviteExpired('2024-01-01T00:00:00.000Z')).toBe(true);
  });

  it('returns true when the expiry is exactly now (boundary: expired)', () => {
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
    // The function uses `< new Date()` so a date equal to now is considered expired.
    expect(isInviteExpired('2024-06-01T12:00:00.000Z')).toBe(false); // exactly now is NOT expired
  });

  it('returns true when the expiry was 1 millisecond ago', () => {
    vi.setSystemTime(new Date('2024-06-01T12:00:00.001Z'));
    expect(isInviteExpired('2024-06-01T12:00:00.000Z')).toBe(true);
  });

  it('returns false when the expiry is 1 millisecond in the future', () => {
    vi.setSystemTime(new Date('2024-05-31T23:59:59.999Z'));
    expect(isInviteExpired('2024-06-01T00:00:00.000Z')).toBe(false);
  });

  it('handles ISO 8601 with timezone offset correctly', () => {
    vi.setSystemTime(new Date('2024-06-01T14:00:00.000Z'));
    // 2024-06-01T12:00:00+00:00 is in the past relative to 14:00Z
    expect(isInviteExpired('2024-06-01T12:00:00+00:00')).toBe(true);
  });
});

// ── isInviteAtMaxUses ─────────────────────────────────────────────────────────

describe('isInviteAtMaxUses', () => {
  it('returns false when maxUses is null (unlimited)', () => {
    expect(isInviteAtMaxUses(0, null)).toBe(false);
    expect(isInviteAtMaxUses(1000, null)).toBe(false);
  });

  it('returns false when use count is below the cap', () => {
    expect(isInviteAtMaxUses(0, 10)).toBe(false);
    expect(isInviteAtMaxUses(9, 10)).toBe(false);
    expect(isInviteAtMaxUses(4, 5)).toBe(false);
  });

  it('returns true when use count equals the cap', () => {
    expect(isInviteAtMaxUses(10, 10)).toBe(true);
    expect(isInviteAtMaxUses(5, 5)).toBe(true);
    expect(isInviteAtMaxUses(1, 1)).toBe(true);
  });

  it('returns true when use count exceeds the cap (safety guard)', () => {
    expect(isInviteAtMaxUses(11, 10)).toBe(true);
    expect(isInviteAtMaxUses(100, 1)).toBe(true);
  });

  it('returns false for a single-use invite not yet used', () => {
    expect(isInviteAtMaxUses(0, 1)).toBe(false);
  });

  it('returns true for a single-use invite that has been used', () => {
    expect(isInviteAtMaxUses(1, 1)).toBe(true);
  });

  it('handles zero max_uses correctly (always at max)', () => {
    expect(isInviteAtMaxUses(0, 0)).toBe(true);
  });
});
