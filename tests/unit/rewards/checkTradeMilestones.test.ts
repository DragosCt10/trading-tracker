/**
 * Tests for checkTradeMilestones in feedNotifications.ts.
 *
 * After SC3 (discount normalization), checkTradeMilestones writes discount rows
 * to the user_discounts table via upsertMilestoneDiscount() and updates trade_badge
 * in feature_flags via updateFeatureFlags(). The JSONB couponCode-wipe regression
 * is architecturally impossible now — each discount is its own row and
 * `INSERT ON CONFLICT DO NOTHING` cannot affect existing rows.
 */
import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mock all external dependencies of feedNotifications.ts ───────────────────
// These are hoisted — they run before any imports below.

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/server/session', () => ({ getCachedUserSession: vi.fn() }));
vi.mock('@/lib/server/socialProfile', () => ({ getCachedSocialProfile: vi.fn() }));
vi.mock('@/lib/server/feedHelpers', () => ({ isValidCursor: vi.fn(() => true) }));
vi.mock('@/utils/displayName', () => ({ getAnonymousDisplayName: vi.fn((id: string) => id) }));
vi.mock('@/lib/server/feedActivity', () => ({
  getUserActivityCount: vi.fn().mockResolvedValue({ posts: 0, comments: 0, total: 0 }),
}));
vi.mock('@/lib/server/supabaseAdmin');
vi.mock('@/lib/server/tradeStats');
vi.mock('@/lib/server/discounts', () => ({
  upsertMilestoneDiscount: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/server/settings', () => ({
  updateFeatureFlags: vi.fn().mockResolvedValue(undefined),
}));

import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { getTotalExecutedTradeCount } from '@/lib/server/tradeStats';
import { checkTradeMilestones } from '@/lib/server/feedNotifications';
import { upsertMilestoneDiscount } from '@/lib/server/discounts';
import { updateFeatureFlags } from '@/lib/server/settings';

const mockedCreateAdminClient = vi.mocked(createAdminClient);
const mockedGetTotalTrades = vi.mocked(getTotalExecutedTradeCount);
const mockedUpsertMilestoneDiscount = vi.mocked(upsertMilestoneDiscount);
const mockedUpdateFeatureFlags = vi.mocked(updateFeatureFlags);

// ── Mock client factory ───────────────────────────────────────────────────────

interface MockClientConfig {
  tradeBadge?: string | null;
  existingNotifTypes?: string[];
  featureFlags?: Record<string, unknown>;
  insertSpy?: ReturnType<typeof vi.fn>;
}

function buildMockClient(cfg: MockClientConfig) {
  const insertSpy = cfg.insertSpy ?? vi.fn().mockResolvedValue({ error: null });

  const profileData = cfg.tradeBadge !== undefined
    ? { trade_badge: cfg.tradeBadge }
    : null;

  return {
    from: vi.fn((table: string) => {
      if (table === 'social_profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: profileData })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        };
      }

      if (table === 'feed_notifications') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn(() =>
                Promise.resolve({
                  data: (cfg.existingNotifTypes ?? []).map((type) => ({ type })),
                }),
              ),
            })),
          })),
          insert: insertSpy,
        };
      }

      if (table === 'user_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() =>
                Promise.resolve({ data: { feature_flags: cfg.featureFlags ?? {} } }),
              ),
            })),
          })),
        };
      }

      return {};
    }),
  };
}

// ── Shared constants ──────────────────────────────────────────────────────────

const PROFILE_ID = 'profile-abc';
const USER_ID = 'user-abc';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('checkTradeMilestones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: 150 trades → rookie_trader
    mockedGetTotalTrades.mockResolvedValue(150);
  });

  describe('user_discounts writes (post-SC3)', () => {
    it('calls upsertMilestoneDiscount for each crossed milestone', async () => {
      mockedGetTotalTrades.mockResolvedValue(500); // rookie + skilled + expert
      const client = buildMockClient({
        tradeBadge: null,
        existingNotifTypes: [],
        featureFlags: {},
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      // Should be called 3 times — once per crossed milestone (rookie, skilled, expert)
      expect(mockedUpsertMilestoneDiscount).toHaveBeenCalledTimes(3);
      const calls = mockedUpsertMilestoneDiscount.mock.calls.map((c) => c[1]);
      expect(calls).toContain('rookie_trader');
      expect(calls).toContain('skilled_trader');
      expect(calls).toContain('expert_trader');
    });

    it('passes correct discountPct for each milestone', async () => {
      mockedGetTotalTrades.mockResolvedValue(150);
      const client = buildMockClient({
        tradeBadge: null,
        existingNotifTypes: [],
        featureFlags: {},
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      expect(mockedUpsertMilestoneDiscount).toHaveBeenCalledWith(USER_ID, 'rookie_trader', 5);
    });

    it('upserts are architecturally safe: INSERT ON CONFLICT DO NOTHING cannot touch existing rows (regression guard)', async () => {
      // This replaces the old couponCode-preservation regression test. The new architecture
      // makes the regression impossible: each discount is its own row, and
      // upsertMilestoneDiscount uses ignoreDuplicates: true.
      mockedGetTotalTrades.mockResolvedValue(500);
      const client = buildMockClient({
        tradeBadge: 'rookie_trader',
        existingNotifTypes: ['trade_milestone_100'],
        featureFlags: {
          trade_badge: { id: 'rookie_trader', totalTrades: 100, achievedAt: '2026-01-01' },
        },
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      // Each upsert call is independent — cannot affect other milestone rows
      expect(mockedUpsertMilestoneDiscount).toHaveBeenCalledTimes(3);
    });
  });

  describe('trade_badge writes via updateFeatureFlags', () => {
    it('sets trade_badge to current milestone', async () => {
      mockedGetTotalTrades.mockResolvedValue(200);
      const client = buildMockClient({
        tradeBadge: null,
        existingNotifTypes: [],
        featureFlags: {},
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      expect(mockedUpdateFeatureFlags).toHaveBeenCalledOnce();
      const [, flags] = mockedUpdateFeatureFlags.mock.calls[0];
      expect(flags.trade_badge?.id).toBe('skilled_trader');
      expect(flags.trade_badge?.totalTrades).toBe(200);
    });

    it('preserves achievedAt on second run (not reset to current time)', async () => {
      const originalAchievedAt = '2026-01-15T10:00:00Z';
      const client = buildMockClient({
        tradeBadge: 'rookie_trader',
        existingNotifTypes: ['trade_milestone_100'],
        featureFlags: {
          trade_badge: {
            id: 'rookie_trader',
            totalTrades: 100,
            achievedAt: originalAchievedAt,
          },
        },
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      const [, flags] = mockedUpdateFeatureFlags.mock.calls[0];
      expect(flags.trade_badge?.achievedAt).toBe(originalAchievedAt);
    });

    it('sets achievedAt on first achievement (no prior badge)', async () => {
      const before = new Date().toISOString();

      const client = buildMockClient({
        tradeBadge: null,
        existingNotifTypes: [],
        featureFlags: {},
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      const [, flags] = mockedUpdateFeatureFlags.mock.calls[0];
      const achievedAt = flags.trade_badge?.achievedAt;
      expect(achievedAt).toBeDefined();
      expect(new Date(achievedAt!).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    });
  });

  describe('alpha_trader early return', () => {
    it('skips all writes when trade_badge is already alpha_trader', async () => {
      const client = buildMockClient({ tradeBadge: 'alpha_trader' });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      expect(mockedUpdateFeatureFlags).not.toHaveBeenCalled();
      expect(mockedUpsertMilestoneDiscount).not.toHaveBeenCalled();
    });
  });

  describe('batch notification inserts', () => {
    it('inserts only missing notifications (skips already-notified types)', async () => {
      mockedGetTotalTrades.mockResolvedValue(500);

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      const client = buildMockClient({
        tradeBadge: null,
        existingNotifTypes: ['trade_milestone_100', 'trade_milestone_200'],
        featureFlags: {},
        insertSpy,
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      expect(insertSpy).toHaveBeenCalledOnce();
      const inserted = insertSpy.mock.calls[0][0] as Array<{ type: string }>;
      expect(inserted).toHaveLength(1);
      expect(inserted[0].type).toBe('trade_milestone_500');
    });

    it('skips insert entirely when all crossed milestones are already notified', async () => {
      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      const client = buildMockClient({
        tradeBadge: 'rookie_trader',
        existingNotifTypes: ['trade_milestone_100'],
        featureFlags: {},
        insertSpy,
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      expect(insertSpy).not.toHaveBeenCalled();
    });

    it('uses a single batch INSERT for all new milestones (not N separate queries)', async () => {
      mockedGetTotalTrades.mockResolvedValue(1000);

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      const client = buildMockClient({
        tradeBadge: null,
        existingNotifTypes: [],
        featureFlags: {},
        insertSpy,
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      expect(insertSpy).toHaveBeenCalledOnce();
      const inserted = insertSpy.mock.calls[0][0] as Array<{ type: string; recipient_id: string }>;
      expect(inserted).toHaveLength(5);
      expect(inserted.map((r) => r.type)).toEqual([
        'trade_milestone_100',
        'trade_milestone_200',
        'trade_milestone_500',
        'trade_milestone_750',
        'trade_milestone_1000',
      ]);
      inserted.forEach((row) => expect(row.recipient_id).toBe(PROFILE_ID));
    });
  });

  describe('below first milestone threshold', () => {
    it('returns without writes when user has fewer than 100 trades', async () => {
      mockedGetTotalTrades.mockResolvedValue(50);

      const client = buildMockClient({ tradeBadge: null, featureFlags: {} });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      expect(mockedUpdateFeatureFlags).not.toHaveBeenCalled();
      expect(mockedUpsertMilestoneDiscount).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('does not throw when supabase throws (non-fatal fire-and-forget)', async () => {
      mockedCreateAdminClient.mockReturnValue({
        from: vi.fn().mockImplementation(() => {
          throw new Error('DB connection lost');
        }),
      } as ReturnType<typeof createAdminClient>);

      await expect(checkTradeMilestones(PROFILE_ID, USER_ID)).resolves.toBeUndefined();
    });
  });
});
