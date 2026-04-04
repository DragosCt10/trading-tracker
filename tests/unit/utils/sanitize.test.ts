import { describe, it, expect } from 'vitest';
import { sanitizeForDiscord } from '@/utils/sanitize';

describe('sanitizeForDiscord', () => {
  it('replaces @everyone with a zero-width space after @', () => {
    expect(sanitizeForDiscord('@everyone')).toBe('@\u200beveryone');
  });

  it('replaces @here with a zero-width space after @', () => {
    expect(sanitizeForDiscord('@here')).toBe('@\u200bhere');
  });

  it('is case-insensitive for @everyone', () => {
    expect(sanitizeForDiscord('@Everyone')).toBe('@\u200bEveryone');
    expect(sanitizeForDiscord('@EVERYONE')).toBe('@\u200bEVERYONE');
  });

  it('is case-insensitive for @here', () => {
    expect(sanitizeForDiscord('@HERE')).toBe('@\u200bHERE');
  });

  it('replaces user mentions <@123456>', () => {
    expect(sanitizeForDiscord('<@123456>')).toBe('[mention removed]');
  });

  it('replaces nickname mentions <@!123456>', () => {
    expect(sanitizeForDiscord('<@!123456>')).toBe('[mention removed]');
  });

  it('replaces role mentions <@&123456>', () => {
    expect(sanitizeForDiscord('<@&123456>')).toBe('[mention removed]');
  });

  it('replaces channel references <#987654>', () => {
    expect(sanitizeForDiscord('<#987654>')).toBe('[channel removed]');
  });

  it('leaves clean text unchanged', () => {
    const clean = 'Hello, I have a question about my account.';
    expect(sanitizeForDiscord(clean)).toBe(clean);
  });

  it('leaves an empty string unchanged', () => {
    expect(sanitizeForDiscord('')).toBe('');
  });

  it('handles multiple replacements in one string', () => {
    const input = 'Hey @everyone, check <#123> and ping <@!456> or @here!';
    const result = sanitizeForDiscord(input);
    expect(result).toBe(
      'Hey @\u200beveryone, check [channel removed] and ping [mention removed] or @\u200bhere!',
    );
  });

  it('does not alter an ordinary email-style @ sign', () => {
    const input = 'Contact us at support@example.com';
    expect(sanitizeForDiscord(input)).toBe('Contact us at support@example.com');
  });
});
