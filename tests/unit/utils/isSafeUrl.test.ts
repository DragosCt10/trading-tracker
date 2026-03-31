import { describe, it, expect } from 'vitest';
import { isSafeUrl } from '@/utils/isSafeUrl';

describe('isSafeUrl', () => {
  it('returns true for https:// URLs', () => {
    expect(isSafeUrl('https://example.com/image.png')).toBe(true);
  });

  it('returns true for http:// URLs', () => {
    expect(isSafeUrl('http://example.com/image.png')).toBe(true);
  });

  it('returns false for javascript: URLs', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
  });

  it('returns false for data: URLs', () => {
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSafeUrl('')).toBe(false);
  });

  it('returns false for ftp: URLs', () => {
    expect(isSafeUrl('ftp://files.example.com/report.csv')).toBe(false);
  });

  it('returns false for relative paths', () => {
    expect(isSafeUrl('/images/photo.jpg')).toBe(false);
  });
});
