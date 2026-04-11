/**
 * Pure-function tests for feedHelpers.ts.
 * No mocking required — deterministic inputs → outputs.
 */
import { describe, it, expect } from 'vitest';
import { isValidCursor, mapAuthorRow } from '@/lib/server/feedHelpers';

// ── isValidCursor ─────────────────────────────────────────────────────────────

describe('isValidCursor', () => {
  it('accepts a standard ISO-8601 datetime string', () => {
    expect(isValidCursor('2024-06-15T12:34:56.789Z')).toBe(true);
  });

  it('accepts an ISO string with timezone offset', () => {
    expect(isValidCursor('2024-06-15T12:34:56+02:00')).toBe(true);
  });

  it('accepts a date-only ISO string (YYYY-MM-DDT…)', () => {
    expect(isValidCursor('2024-01-01T00:00:00.000Z')).toBe(true);
  });

  it('accepts the earliest possible date', () => {
    expect(isValidCursor('1970-01-01T00:00:00.000Z')).toBe(true);
  });

  it('accepts a far-future date', () => {
    expect(isValidCursor('2099-12-31T23:59:59.999Z')).toBe(true);
  });

  it('rejects a plain date string (YYYY-MM-DD)', () => {
    expect(isValidCursor('2024-06-15')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidCursor('')).toBe(false);
  });

  it('rejects a UUID (wrong format)', () => {
    expect(isValidCursor('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });

  it('rejects arbitrary text', () => {
    expect(isValidCursor('next-page')).toBe(false);
  });

  it('rejects a number string', () => {
    expect(isValidCursor('1234567890')).toBe(false);
  });

  it('rejects an invalid ISO date (month 13)', () => {
    expect(isValidCursor('2024-13-01T00:00:00.000Z')).toBe(false);
  });

  it('rejects null-like strings', () => {
    expect(isValidCursor('null')).toBe(false);
    expect(isValidCursor('undefined')).toBe(false);
  });

  it('rejects the string "NaN"', () => {
    expect(isValidCursor('NaN')).toBe(false);
  });
});

// ── mapAuthorRow ──────────────────────────────────────────────────────────────

describe('mapAuthorRow', () => {
  it('maps a complete row without modification', () => {
    const raw = {
      id: 'profile-1',
      user_id: 'user-1',
      display_name: 'Alice',
      username: 'alice',
      avatar_url: 'https://cdn.example.com/avatar.jpg',
      tier: 'pro' as const,
      is_public: true,
      trade_badge: 'expert_trader',
    };
    const result = mapAuthorRow(raw);
    expect(result.id).toBe('profile-1');
    expect(result.user_id).toBe('user-1');
    expect(result.display_name).toBe('Alice');
    expect(result.username).toBe('alice');
    expect(result.avatar_url).toBe('https://cdn.example.com/avatar.jpg');
    expect(result.tier).toBe('pro');
    expect(result.is_public).toBe(true);
    expect(result.trade_badge).toBe('expert_trader');
  });

  it('falls back to "unknown_author" when id is missing', () => {
    expect(mapAuthorRow({}).id).toBe('unknown_author');
    expect(mapAuthorRow({ id: '' }).id).toBe('unknown_author');
  });

  it('falls back to "unknown_user" when user_id is missing', () => {
    expect(mapAuthorRow({}).user_id).toBe('unknown_user');
    expect(mapAuthorRow({ user_id: '' }).user_id).toBe('unknown_user');
  });

  it('falls back to "Unknown trader" when display_name is missing', () => {
    expect(mapAuthorRow({}).display_name).toBe('Unknown trader');
    expect(mapAuthorRow({ display_name: '' }).display_name).toBe('Unknown trader');
  });

  it('falls back to "unknown" when username is missing', () => {
    expect(mapAuthorRow({}).username).toBe('unknown');
    expect(mapAuthorRow({ username: '' }).username).toBe('unknown');
  });

  it('returns null for avatar_url when missing', () => {
    expect(mapAuthorRow({}).avatar_url).toBeNull();
  });

  it('preserves a valid avatar_url string', () => {
    expect(mapAuthorRow({ avatar_url: 'https://cdn.example.com/a.jpg' }).avatar_url)
      .toBe('https://cdn.example.com/a.jpg');
  });

  it('returns null for avatar_url when the value is a non-string', () => {
    expect(mapAuthorRow({ avatar_url: 123 as unknown as string }).avatar_url).toBeNull();
  });

  it('defaults tier to "starter" when missing', () => {
    expect(mapAuthorRow({}).tier).toBe('starter');
  });

  it('preserves a valid tier', () => {
    expect(mapAuthorRow({ tier: 'pro' as const }).tier).toBe('pro');
    expect(mapAuthorRow({ tier: 'elite' as const }).tier).toBe('elite');
  });

  it('defaults is_public to true when missing', () => {
    expect(mapAuthorRow({}).is_public).toBe(true);
  });

  it('preserves false for is_public', () => {
    expect(mapAuthorRow({ is_public: false }).is_public).toBe(false);
  });

  it('returns null for trade_badge when missing', () => {
    expect(mapAuthorRow({}).trade_badge).toBeNull();
  });

  it('preserves a valid trade_badge string', () => {
    expect(mapAuthorRow({ trade_badge: 'alpha_trader' }).trade_badge).toBe('alpha_trader');
  });

  it('returns null for trade_badge when the value is a non-string', () => {
    expect(mapAuthorRow({ trade_badge: 42 as unknown as string }).trade_badge).toBeNull();
  });

  it('handles a completely empty input gracefully', () => {
    const result = mapAuthorRow({});
    expect(result.id).toBe('unknown_author');
    expect(result.user_id).toBe('unknown_user');
    expect(result.display_name).toBe('Unknown trader');
    expect(result.username).toBe('unknown');
    expect(result.avatar_url).toBeNull();
    expect(result.tier).toBe('starter');
    expect(result.is_public).toBe(true);
    expect(result.trade_badge).toBeNull();
  });

  it('does not mutate the input object', () => {
    const raw = { id: 'p1', username: 'alice' };
    mapAuthorRow(raw);
    expect(raw).toEqual({ id: 'p1', username: 'alice' });
  });
});
