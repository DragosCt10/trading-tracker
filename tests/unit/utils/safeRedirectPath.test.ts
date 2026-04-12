import { describe, it, expect } from 'vitest';
import { safeRedirectPath } from '@/utils/safeRedirectPath';

describe('safeRedirectPath', () => {
  describe('rejects unsafe inputs', () => {
    it('null', () => {
      expect(safeRedirectPath(null)).toBeNull();
    });

    it('empty string', () => {
      expect(safeRedirectPath('')).toBeNull();
    });

    it('paths that do not start with /', () => {
      expect(safeRedirectPath('stats')).toBeNull();
      expect(safeRedirectPath('https://evil.com/stats')).toBeNull();
    });

    it('protocol-relative URLs', () => {
      expect(safeRedirectPath('//evil.com')).toBeNull();
      expect(safeRedirectPath('//evil.com/stats')).toBeNull();
    });

    it('paths containing a colon (javascript:, data:, file:)', () => {
      expect(safeRedirectPath('/foo:bar')).toBeNull();
      expect(safeRedirectPath('javascript:alert(1)')).toBeNull();
      expect(safeRedirectPath('data:text/html,<script>alert(1)</script>')).toBeNull();
    });
  });

  describe('rejects auth routes (prevent post-login loops)', () => {
    it('root /', () => {
      expect(safeRedirectPath('/')).toBeNull();
    });

    it('/login and nested login paths', () => {
      expect(safeRedirectPath('/login')).toBeNull();
      expect(safeRedirectPath('/login?foo=bar')).toBeNull();
    });

    it('/signup', () => {
      expect(safeRedirectPath('/signup')).toBeNull();
    });

    it('/reset-password', () => {
      expect(safeRedirectPath('/reset-password')).toBeNull();
    });

    it('/update-password', () => {
      expect(safeRedirectPath('/update-password')).toBeNull();
    });

    it('/auth/* (callback routes)', () => {
      expect(safeRedirectPath('/auth/callback')).toBeNull();
    });
  });

  describe('accepts safe relative paths', () => {
    it('/stats', () => {
      expect(safeRedirectPath('/stats')).toBe('/stats');
    });

    it('/strategies', () => {
      expect(safeRedirectPath('/strategies')).toBe('/strategies');
    });

    it('nested app paths with query strings', () => {
      expect(safeRedirectPath('/strategy/foo?tab=trades')).toBe('/strategy/foo?tab=trades');
    });

    it('paths with fragments', () => {
      expect(safeRedirectPath('/strategies#top')).toBe('/strategies#top');
    });
  });
});
