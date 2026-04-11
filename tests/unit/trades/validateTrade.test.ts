import { describe, it, expect } from 'vitest';
import { validateTrade } from '@/utils/validateTrade';
import type { Trade } from '@/types/trade';

/** Minimal valid trade for testing — all required fields populated. */
function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    trade_screens: ['', '', '', ''],
    trade_time: '09:00',
    trade_date: '2025-01-15',
    day_of_week: 'Wednesday',
    market: 'EURUSD',
    setup_type: 'OTE',
    liquidity: 'HOD',
    direction: 'Long',
    trade_outcome: 'Win',
    session: 'London',
    break_even: false,
    reentry: false,
    news_related: false,
    mss: 'Bullish',
    local_high_low: false,
    notes: '',
    quarter: 'Q1',
    evaluation: 'A',
    partials_taken: false,
    executed: true,
    launch_hour: false,
    trend: 'Trend-following',
    strategy_id: 'strat-1',
    risk_per_trade: 0.5,
    risk_reward_ratio: 2,
    risk_reward_ratio_long: 3,
    displacement_size: 10,
    sl_size: 5,
    fvg_size: 1.5,
    tags: [],
    ...overrides,
  };
}

const hasAllCards = () => true;
const hasNoCards = () => false;
const hasCards = (...keys: string[]) => (k: string) => keys.includes(k);

describe('validateTrade', () => {
  it('returns null for a fully valid trade', () => {
    expect(validateTrade(makeTrade(), hasAllCards)).toBeNull();
  });

  // --- Required field checks ---

  it('rejects missing market', () => {
    expect(validateTrade(makeTrade({ market: '' }), hasNoCards)).toContain('Market');
  });

  it('rejects missing direction', () => {
    const result = validateTrade(makeTrade({ direction: '' }), hasNoCards);
    expect(result).toContain('Direction');
  });

  it('rejects missing trade_outcome', () => {
    const result = validateTrade(makeTrade({ trade_outcome: '' }), hasNoCards);
    expect(result).toContain('Trade Outcome');
  });

  it('rejects missing session', () => {
    const result = validateTrade(makeTrade({ session: '' }), hasNoCards);
    expect(result).toContain('Session');
  });

  it('rejects missing trade_time', () => {
    const result = validateTrade(makeTrade({ trade_time: '' }), hasNoCards);
    expect(result).toContain('Trade Time');
  });

  it('rejects missing strategy_id', () => {
    const result = validateTrade(makeTrade({ strategy_id: null }), hasNoCards);
    expect(result).toContain('Strategy');
  });

  // --- Extra card conditional checks ---

  it('rejects missing setup_type when setup_stats card enabled', () => {
    const result = validateTrade(makeTrade({ setup_type: '' }), hasCards('setup_stats'));
    expect(result).toContain('Pattern');
  });

  it('allows missing setup_type when setup_stats card disabled', () => {
    expect(validateTrade(makeTrade({ setup_type: '' }), hasNoCards)).toBeNull();
  });

  it('rejects missing liquidity when liquidity_stats card enabled', () => {
    const result = validateTrade(makeTrade({ liquidity: '' }), hasCards('liquidity_stats'));
    expect(result).toContain('Liquidity');
  });

  it('rejects missing mss when mss_stats card enabled', () => {
    const result = validateTrade(makeTrade({ mss: '' }), hasCards('mss_stats'));
    expect(result).toContain('MSS');
  });

  it('rejects missing evaluation when evaluation_stats card enabled', () => {
    const result = validateTrade(makeTrade({ evaluation: '' }), hasCards('evaluation_stats'));
    expect(result).toContain('Evaluation');
  });

  it('rejects missing trend when trend_stats card enabled', () => {
    const result = validateTrade(makeTrade({ trend: '' }), hasCards('trend_stats'));
    expect(result).toContain('Trend');
  });

  it('rejects missing fvg_size when fvg_size card enabled', () => {
    const result = validateTrade(makeTrade({ fvg_size: undefined }), hasCards('fvg_size'));
    expect(result).toContain('FVG');
  });

  it('rejects missing displacement_size when displacement_size card enabled', () => {
    const result = validateTrade(makeTrade({ displacement_size: undefined }), hasCards('displacement_size'));
    expect(result).toContain('Displacement');
  });

  it('rejects missing displacement_size when avg_displacement card enabled', () => {
    const result = validateTrade(makeTrade({ displacement_size: undefined }), hasCards('avg_displacement'));
    expect(result).toContain('Displacement');
  });

  it('rejects missing sl_size when sl_size_stats card enabled', () => {
    const result = validateTrade(makeTrade({ sl_size: undefined }), hasCards('sl_size_stats'));
    expect(result).toContain('SL Size');
  });

  // --- Numeric validation (9A) ---

  it('rejects NaN risk_per_trade', () => {
    const result = validateTrade(makeTrade({ risk_per_trade: NaN }), hasNoCards);
    expect(result).toContain('Risk Per Trade');
  });

  it('rejects Infinity risk_reward_ratio', () => {
    const result = validateTrade(makeTrade({ risk_reward_ratio: Infinity }), hasNoCards);
    expect(result).toContain('Risk:Reward');
  });

  it('rejects NaN displacement_size', () => {
    const result = validateTrade(makeTrade({ displacement_size: NaN }), hasNoCards);
    expect(result).toContain('Displacement');
  });

  it('rejects NaN fvg_size', () => {
    const result = validateTrade(makeTrade({ fvg_size: NaN }), hasNoCards);
    expect(result).toContain('FVG');
  });

  it('rejects NaN sl_size', () => {
    const result = validateTrade(makeTrade({ sl_size: NaN }), hasNoCards);
    expect(result).toContain('SL Size');
  });

  it('accepts valid numeric values', () => {
    expect(validateTrade(makeTrade({ risk_per_trade: 0.5, risk_reward_ratio: 2 }), hasNoCards)).toBeNull();
  });

  it('accepts zero as a valid numeric value', () => {
    expect(validateTrade(makeTrade({ risk_per_trade: 0 }), hasNoCards)).toBeNull();
  });

  // --- Null/undefined numeric fields pass validation ---

  it('accepts undefined numeric fields (optional)', () => {
    expect(validateTrade(makeTrade({
      risk_per_trade: undefined,
      risk_reward_ratio: undefined,
      displacement_size: undefined,
      fvg_size: undefined,
      sl_size: undefined,
    }), hasNoCards)).toBeNull();
  });
});
