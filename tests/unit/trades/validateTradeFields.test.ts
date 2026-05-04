import { describe, it, expect } from 'vitest';
import { validateTradeFields } from '@/utils/validateTradeFields';

describe('validateTradeFields', () => {
  it('returns null for valid fields', () => {
    expect(validateTradeFields({ notes: 'Short note', setup_type: 'breakout' })).toBeNull();
  });

  it('returns null for empty/missing fields', () => {
    expect(validateTradeFields({})).toBeNull();
  });

  it('rejects notes over 5000 characters', () => {
    const longNotes = 'a'.repeat(5001);
    expect(validateTradeFields({ notes: longNotes })).toContain('Notes');
  });

  it('accepts notes at exactly 5000 characters', () => {
    const notes = 'a'.repeat(5000);
    expect(validateTradeFields({ notes })).toBeNull();
  });

  it('rejects setup_type over 100 characters', () => {
    expect(validateTradeFields({ setup_type: 'x'.repeat(101) })).toContain('setup_type');
  });

  it('rejects liquidity over 100 characters', () => {
    expect(validateTradeFields({ liquidity: 'x'.repeat(101) })).toContain('liquidity');
  });

  it('rejects news_name over 100 characters', () => {
    expect(validateTradeFields({ news_name: 'x'.repeat(101) })).toContain('news_name');
  });

  it('rejects trade_screen URLs over 2048 characters', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2030);
    expect(validateTradeFields({ trade_screens: [longUrl] })).toContain('URL');
  });

  it('rejects javascript: URLs in trade_screens', () => {
    expect(validateTradeFields({ trade_screens: ['javascript:alert(1)'] })).toContain('http');
  });

  it('rejects data: URLs in trade_screens', () => {
    expect(validateTradeFields({ trade_screens: ['data:text/html,test'] })).toContain('http');
  });

  it('allows empty strings in trade_screens (no screenshot)', () => {
    expect(validateTradeFields({ trade_screens: ['', '', '', ''] })).toBeNull();
  });

  it('allows valid https URLs in trade_screens', () => {
    expect(validateTradeFields({ trade_screens: ['https://example.com/chart.png', ''] })).toBeNull();
  });

  it.each(['25:00', '10:60', 'abc', '10', '24:00', '9:00'])(
    'rejects malformed trade_time: %s',
    (bad) => {
      expect(validateTradeFields({ trade_time: bad })).toContain('HH:MM');
    },
  );

  it('accepts valid trade_time HH:MM and HH:MM:SS forms', () => {
    expect(validateTradeFields({ trade_time: '10:24' })).toBeNull();
    expect(validateTradeFields({ trade_time: '10:24:00' })).toBeNull();
    expect(validateTradeFields({ trade_time: '00:00' })).toBeNull();
    expect(validateTradeFields({ trade_time: '23:59:59' })).toBeNull();
  });

  it('skips trade_time check when field is empty/missing', () => {
    expect(validateTradeFields({ trade_time: '' })).toBeNull();
    expect(validateTradeFields({})).toBeNull();
  });
});
