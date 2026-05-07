import { describe, it, expect } from 'vitest';
import { isPublicPath, PUBLIC_PATHS } from '../publicPaths';

describe('isPublicPath', () => {
  describe('new entries (backtesting landing)', () => {
    it('allows /backtesting/landing for anonymous visitors', () => {
      expect(isPublicPath('/backtesting/landing')).toBe(true);
    });

    it('allows the bare /backtesting prefix', () => {
      expect(isPublicPath('/backtesting')).toBe(true);
    });
  });

  describe('regression: auth-gated routes must NOT match', () => {
    // Critical: the existing backtest UI lives at /strategy/[strategy]/backtest/.
    // The new /backtesting prefix must not accidentally allowlist it.
    it('still gates /strategy/{id}/backtest behind auth', () => {
      expect(isPublicPath('/strategy/abc/backtest')).toBe(false);
    });

    it('still gates /dashboard behind auth', () => {
      expect(isPublicPath('/dashboard')).toBe(false);
    });

    it('still gates /strategies behind auth', () => {
      expect(isPublicPath('/strategies')).toBe(false);
    });

    it('still gates /insight-vault behind auth', () => {
      expect(isPublicPath('/insight-vault')).toBe(false);
    });
  });

  describe('prefix-collision safety (no false positives)', () => {
    // Match must be exact or `${entry}/...`, never substring.
    it('does not match /sharepoint when /share is allowlisted', () => {
      expect(isPublicPath('/sharepoint')).toBe(false);
    });

    it('does not match /backtesting-secret', () => {
      expect(isPublicPath('/backtesting-secret')).toBe(false);
    });
  });

  describe('existing public routes still allowed', () => {
    it.each([
      ['/', '/'],
      ['/share', '/share'],
      ['/share/strategy/abc', '/share/strategy/abc'],
      ['/pricing', '/pricing'],
      ['/terms-of-service', '/terms-of-service'],
      ['/privacy-policy', '/privacy-policy'],
      ['/refund-policy', '/refund-policy'],
      ['/contact', '/contact'],
      ['/help', '/help'],
      ['/help/getting-started', '/help/getting-started'],
      ['/affiliates', '/affiliates'],
      ['/unsubscribe', '/unsubscribe'],
      ['/feed', '/feed'],
    ])('allows %s', (path) => {
      expect(isPublicPath(path)).toBe(true);
    });
  });

  describe('PUBLIC_PATHS array invariants', () => {
    it('has no duplicate entries', () => {
      expect(new Set(PUBLIC_PATHS).size).toBe(PUBLIC_PATHS.length);
    });

    it('every entry starts with a slash', () => {
      for (const p of PUBLIC_PATHS) {
        expect(p.startsWith('/')).toBe(true);
      }
    });

    it('no entry has a trailing slash (except root)', () => {
      for (const p of PUBLIC_PATHS) {
        if (p === '/') continue;
        expect(p.endsWith('/')).toBe(false);
      }
    });
  });
});
