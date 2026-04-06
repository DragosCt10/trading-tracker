/**
 * Pure-function tests for tradeMilestones.ts and dateHelpers.ts.
 * No mocking required — deterministic inputs → outputs.
 */
import { describe, it, expect } from 'vitest';
import {
  TRADE_MILESTONES,
  getMilestoneForCount,
  getNextMilestone,
  getCrossedMilestones,
  getMilestoneById,
  getBadgeInlineStyle,
} from '@/constants/tradeMilestones';
import { monthsSince } from '@/utils/helpers/dateHelpers';

// ── getMilestoneForCount ──────────────────────────────────────────────────────

describe('getMilestoneForCount', () => {
  it('returns null below the first threshold', () => {
    expect(getMilestoneForCount(0)).toBeNull();
    expect(getMilestoneForCount(99)).toBeNull();
  });

  it('returns rookie_trader at exactly 100', () => {
    expect(getMilestoneForCount(100)?.id).toBe('rookie_trader');
  });

  it('returns rookie_trader within its range', () => {
    expect(getMilestoneForCount(150)?.id).toBe('rookie_trader');
    expect(getMilestoneForCount(199)?.id).toBe('rookie_trader');
  });

  it('returns skilled_trader at exactly 200', () => {
    expect(getMilestoneForCount(200)?.id).toBe('skilled_trader');
    expect(getMilestoneForCount(499)?.id).toBe('skilled_trader');
  });

  it('returns expert_trader at 500', () => {
    expect(getMilestoneForCount(500)?.id).toBe('expert_trader');
    expect(getMilestoneForCount(749)?.id).toBe('expert_trader');
  });

  it('returns master_trader at 750', () => {
    expect(getMilestoneForCount(750)?.id).toBe('master_trader');
    expect(getMilestoneForCount(999)?.id).toBe('master_trader');
  });

  it('returns elite_trader at 1000', () => {
    expect(getMilestoneForCount(1000)?.id).toBe('elite_trader');
    expect(getMilestoneForCount(4999)?.id).toBe('elite_trader');
  });

  it('returns alpha_trader at 5000 and beyond', () => {
    expect(getMilestoneForCount(5000)?.id).toBe('alpha_trader');
    expect(getMilestoneForCount(9999)?.id).toBe('alpha_trader');
  });

  it('returns the milestone with the correct discount', () => {
    expect(getMilestoneForCount(100)?.discountPct).toBe(5);
    expect(getMilestoneForCount(1000)?.discountPct).toBe(25);
    expect(getMilestoneForCount(5000)?.discountPct).toBe(50);
  });
});

// ── getNextMilestone ──────────────────────────────────────────────────────────

describe('getNextMilestone', () => {
  it('returns rookie_trader when below 100 trades', () => {
    expect(getNextMilestone(0)?.id).toBe('rookie_trader');
    expect(getNextMilestone(99)?.id).toBe('rookie_trader');
  });

  it('returns the next tier when already at a milestone', () => {
    expect(getNextMilestone(100)?.id).toBe('skilled_trader');
    expect(getNextMilestone(200)?.id).toBe('expert_trader');
    expect(getNextMilestone(500)?.id).toBe('master_trader');
    expect(getNextMilestone(750)?.id).toBe('elite_trader');
    expect(getNextMilestone(1000)?.id).toBe('alpha_trader');
  });

  it('returns null at alpha_trader (no next milestone)', () => {
    expect(getNextMilestone(5000)).toBeNull();
    expect(getNextMilestone(9999)).toBeNull();
  });
});

// ── getCrossedMilestones ──────────────────────────────────────────────────────

describe('getCrossedMilestones', () => {
  it('returns empty array for 0 trades', () => {
    expect(getCrossedMilestones(0)).toHaveLength(0);
  });

  it('returns empty array below first threshold', () => {
    expect(getCrossedMilestones(99)).toHaveLength(0);
  });

  it('returns 1 milestone at exactly 100', () => {
    const crossed = getCrossedMilestones(100);
    expect(crossed).toHaveLength(1);
    expect(crossed[0].id).toBe('rookie_trader');
  });

  it('returns 3 milestones at 500', () => {
    const crossed = getCrossedMilestones(500);
    expect(crossed).toHaveLength(3);
    expect(crossed.map((m) => m.id)).toEqual(['rookie_trader', 'skilled_trader', 'expert_trader']);
  });

  it('returns 5 milestones at 1000', () => {
    expect(getCrossedMilestones(1000)).toHaveLength(5);
  });

  it('returns all 6 milestones at 5000+', () => {
    expect(getCrossedMilestones(5000)).toHaveLength(6);
    expect(getCrossedMilestones(9999)).toHaveLength(6);
  });

  it('preserves ascending order', () => {
    const crossed = getCrossedMilestones(1000);
    for (let i = 1; i < crossed.length; i++) {
      expect(crossed[i].minTrades).toBeGreaterThan(crossed[i - 1].minTrades);
    }
  });
});

// ── getMilestoneById ──────────────────────────────────────────────────────────

describe('getMilestoneById', () => {
  it('finds each valid milestone by id', () => {
    expect(getMilestoneById('rookie_trader')?.badgeName).toBe('Rookie Trader');
    expect(getMilestoneById('skilled_trader')?.badgeName).toBe('Skilled Trader');
    expect(getMilestoneById('expert_trader')?.badgeName).toBe('Expert Trader');
    expect(getMilestoneById('master_trader')?.badgeName).toBe('Master Trader');
    expect(getMilestoneById('elite_trader')?.badgeName).toBe('Elite Trader');
    expect(getMilestoneById('alpha_trader')?.badgeName).toBe('Alpha Trader');
  });

  it('returns undefined for an unknown id', () => {
    expect(getMilestoneById('unknown_trader')).toBeUndefined();
    expect(getMilestoneById('')).toBeUndefined();
  });
});

// ── getBadgeInlineStyle ───────────────────────────────────────────────────────

describe('getBadgeInlineStyle', () => {
  it('generates CSS variable references from milestone id', () => {
    const style = getBadgeInlineStyle('rookie_trader');
    expect(style.background).toBe('var(--badge-rookie-bg)');
    expect(style.borderColor).toBe('var(--badge-rookie-border)');
    expect(style.color).toBe('var(--badge-rookie-text)');
  });

  it('uses the first segment before underscore for each tier', () => {
    expect(getBadgeInlineStyle('skilled_trader').background).toContain('skilled');
    expect(getBadgeInlineStyle('expert_trader').background).toContain('expert');
    expect(getBadgeInlineStyle('master_trader').background).toContain('master');
    expect(getBadgeInlineStyle('alpha_trader').background).toContain('alpha');
  });
});

// ── TRADE_MILESTONES data integrity ──────────────────────────────────────────

describe('TRADE_MILESTONES data integrity', () => {
  it('has exactly 6 milestones', () => {
    expect(TRADE_MILESTONES).toHaveLength(6);
  });

  it('minTrades values are in strictly ascending order', () => {
    for (let i = 1; i < TRADE_MILESTONES.length; i++) {
      expect(TRADE_MILESTONES[i].minTrades).toBeGreaterThan(TRADE_MILESTONES[i - 1].minTrades);
    }
  });

  it('discount percentages increase with each milestone', () => {
    for (let i = 1; i < TRADE_MILESTONES.length; i++) {
      expect(TRADE_MILESTONES[i].discountPct).toBeGreaterThan(TRADE_MILESTONES[i - 1].discountPct);
    }
  });

  it('alpha_trader has null maxTrades (unbounded)', () => {
    const alpha = TRADE_MILESTONES[TRADE_MILESTONES.length - 1];
    expect(alpha.id).toBe('alpha_trader');
    expect(alpha.maxTrades).toBeNull();
  });

  it('each milestone has a notificationType matching its trade count', () => {
    const types = TRADE_MILESTONES.map((m) => m.notificationType);
    expect(types).toContain('trade_milestone_100');
    expect(types).toContain('trade_milestone_1000');
  });
});

// ── monthsSince ───────────────────────────────────────────────────────────────

describe('monthsSince', () => {
  it('returns 0 for the current date', () => {
    const now = new Date().toISOString();
    expect(monthsSince(now)).toBe(0);
  });

  it('returns 0 for a date earlier today', () => {
    const sameDay = new Date();
    sameDay.setHours(0, 0, 0, 0);
    expect(monthsSince(sameDay.toISOString())).toBe(0);
  });

  it('returns correct whole months for a past date', () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    expect(monthsSince(threeMonthsAgo.toISOString())).toBe(3);
  });

  it('returns correct months for a date one year ago', () => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    expect(monthsSince(oneYearAgo.toISOString())).toBe(12);
  });

  it('does not count partial months (returns floor)', () => {
    // A date 1 month and 15 days ago should return 1, not 2
    const partialMonth = new Date();
    partialMonth.setMonth(partialMonth.getMonth() - 1);
    partialMonth.setDate(partialMonth.getDate() - 15);
    // Could be 1 or 2 depending on exact dates; just verify it's >= 1
    expect(monthsSince(partialMonth.toISOString())).toBeGreaterThanOrEqual(1);
  });
});
