import { describe, it, expect } from 'vitest';
import {
  PASSWORD_RULES,
  getPasswordStrength,
  isPasswordStrong,
  STRENGTH_LABELS,
  STRENGTH_COLORS,
} from '@/utils/passwordValidation';

describe('PASSWORD_RULES', () => {
  it('has 5 rules', () => {
    expect(PASSWORD_RULES).toHaveLength(5);
  });

  it('rejects short passwords', () => {
    expect(PASSWORD_RULES[0].test('abc')).toBe(false);
  });

  it('accepts 8+ character passwords', () => {
    expect(PASSWORD_RULES[0].test('12345678')).toBe(true);
  });

  it('requires uppercase', () => {
    expect(PASSWORD_RULES[1].test('abc')).toBe(false);
    expect(PASSWORD_RULES[1].test('Abc')).toBe(true);
  });

  it('requires lowercase', () => {
    expect(PASSWORD_RULES[2].test('ABC')).toBe(false);
    expect(PASSWORD_RULES[2].test('ABc')).toBe(true);
  });

  it('requires a number', () => {
    expect(PASSWORD_RULES[3].test('abcABC')).toBe(false);
    expect(PASSWORD_RULES[3].test('abc1')).toBe(true);
  });

  it('requires a special character', () => {
    expect(PASSWORD_RULES[4].test('abcABC1')).toBe(false);
    expect(PASSWORD_RULES[4].test('abc!')).toBe(true);
  });
});

describe('getPasswordStrength', () => {
  it('returns 0 for empty string', () => {
    expect(getPasswordStrength('')).toBe(0);
  });

  it('returns 5 for a strong password', () => {
    expect(getPasswordStrength('MyStr0ng!')).toBe(5);
  });

  it('returns partial count for partially compliant password', () => {
    // "abcdefgh" meets length + lowercase = 2 rules
    expect(getPasswordStrength('abcdefgh')).toBe(2);
  });
});

describe('isPasswordStrong', () => {
  it('returns true for a strong password', () => {
    expect(isPasswordStrong('MyStr0ng!')).toBe(true);
  });

  it('returns false for a weak password', () => {
    expect(isPasswordStrong('password')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isPasswordStrong('')).toBe(false);
  });
});

describe('STRENGTH_LABELS and STRENGTH_COLORS', () => {
  it('has 6 labels (index 0 is empty)', () => {
    expect(STRENGTH_LABELS).toHaveLength(6);
    expect(STRENGTH_LABELS[0]).toBe('');
    expect(STRENGTH_LABELS[5]).toBe('Very strong');
  });

  it('has 6 colors (index 0 is empty)', () => {
    expect(STRENGTH_COLORS).toHaveLength(6);
    expect(STRENGTH_COLORS[0]).toBe('');
  });
});
