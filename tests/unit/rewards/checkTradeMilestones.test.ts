/**
 * Tests for checkTradeMilestones in feedNotifications.ts.
 *
 * ⚠️  CRITICAL REGRESSION SUITE ⚠️
 * PR 1 fixed a bug where checkTradeMilestones silently dropped couponCode from
 * available_discounts every time it ran. This caused users to lose their earned
 * coupon codes and allowed unlimited duplicate Polar coupon creation.
 *
 * The tests here ensure that bug NEVER silently returns.
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

import { createAdminClient } from '@/lib/server/supabaseAdmin';
import { getTotalExecutedTradeCount } from '@/lib/server/tradeStats';
import { checkTradeMilestones } from '@/lib/server/feedNotifications';

const mockedCreateAdminClient = vi.mocked(createAdminClient);
const mockedGetTotalTrades = vi.mocked(getTotalExecutedTradeCount);

// ── Mock client factory ───────────────────────────────────────────────────────

interface MockClientConfig {
  /** trade_badge value in social_profiles. undefined = profile not found (data: null). */
  tradeBadge?: string | null;
  /** notification types already present in feed_notifications */
  existingNotifTypes?: string[];
  /** existing feature_flags JSON stored in user_settings */
  featureFlags?: Record<string, unknown>;
  /** spy for feed_notifications INSERT — captured for assertions */
  insertSpy?: ReturnType<typeof vi.fn>;
  /** spy for user_settings UPSERT — captured for assertions */
  upsertSpy?: ReturnType<typeof vi.fn>;
}

function buildMockClient(cfg: MockClientConfig) {
  const insertSpy = cfg.insertSpy ?? vi.fn().mockResolvedValue({ error: null });
  const upsertSpy = cfg.upsertSpy ?? vi.fn().mockResolvedValue({ error: null });

  // social_profiles data — undefined cfg.tradeBadge means profile row not found
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
                Promise.resolve({ data: { feature_flags: cfg.featureFlags ?? {}, version: 0 } }),
              ),
            })),
          })),
          upsert: upsertSpy,
          // Support optimistic locking: updateFeatureFlags does .update().eq().eq().select()
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() =>
                  Promise.resolve({ data: [{ user_id: 'user-abc' }], error: null }),
                ),
              })),
            })),
          })),
        };
      }

      return {};
    }),
    // Expose spies so tests can assert on them directly
    _insertSpy: insertSpy,
    _upsertSpy: upsertSpy,
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

  // ─── ⚠️  CRITICAL REGRESSION ────────────────────────────────────────────────

  describe('couponCode preservation (regression guard)', () => {
    it('preserves couponCode after a re-run (prevents duplicate Polar coupons)', async () => {
      const existingFlags = {
        available_discounts: [
          {
            milestoneId: 'rookie_trader',
            discountPct: 5,
            used: false,
            couponCode: 'ROOKIE-SAVED',
            generatedAt: '2026-01-01T00:00:00Z',
          },
        ],
      };

      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      const client = buildMockClient({
        tradeBadge: 'rookie_trader',
        existingNotifTypes: ['trade_milestone_100'],
        featureFlags: existingFlags,
        upsertSpy,
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      expect(upsertSpy).toHaveBeenCalledOnce();
      const saved = upsertSpy.mock.calls[0][0] as { feature_flags: { available_discounts: Array<Record<string, unknown>> } };
      const discounts = saved.feature_flags.available_discounts;

      // THE REGRESSION CHECK: couponCode MUST be preserved
      expect(discounts[0].couponCode).toBe('ROOKIE-SAVED');
      expect(discounts[0].generatedAt).toBe('2026-01-01T00:00:00Z');
      expect(discounts[0].milestoneId).toBe('rookie_trader');
      expect(discounts[0].used).toBe(false);
    });

    it('preserves couponCode across multiple milestones simultaneously', async () => {
      mockedGetTotalTrades.mockResolvedValue(500); // crosses 3 milestones

      const existingFlags = {
        available_discounts: [
          { milestoneId: 'rookie_trader', discountPct: 5, used: true, couponCode: 'ROOKIE-USED', generatedAt: '2025-12-01T00:00:00Z' },
          { milestoneId: 'skilled_trader', discountPct: 10, used: false, couponCode: 'SKILLED-ACTIVE', generatedAt: '2026-01-15T00:00:00Z' },
          // expert_trader not yet redeemed (no couponCode)
        ],
      };

      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      const client = buildMockClient({
        tradeBadge: null,
        existingNotifTypes: ['trade_milestone_100', 'trade_milestone_200', 'trade_milestone_500'],
        featureFlags: existingFlags,
        upsertSpy,
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      const saved = upsertSpy.mock.calls[0][0] as { feature_flags: { available_discounts: Array<Record<string, unknown>> } };
      const discounts = saved.feature_flags.available_discounts;

      expect(discounts).toHaveLength(3);

      const rookie = discounts.find((d) => d.milestoneId === 'rookie_trader');
      expect(rookie?.couponCode).toBe('ROOKIE-USED');
      expect(rookie?.used).toBe(true);

      const skilled = discounts.find((d) => d.milestoneId === 'skilled_trader');
      expect(skilled?.couponCode).toBe('SKILLED-ACTIVE');
      expect(skilled?.used).toBe(false);

      const expert = discounts.find((d) => d.milestoneId === 'expert_trader');
      expect(expert?.couponCode).toBeUndefined(); // not yet redeemed, still undefined
    });
  });

  // ─── achievedAt preservation ──────────────────────────────────────────────

  describe('achievedAt preservation', () => {
    it('preserves achievedAt on second run (not reset to current time)', async () => {
      const originalAchievedAt = '2026-01-15T10:00:00Z';
      const existingFlags = {
        trade_badge: {
          id: 'rookie_trader',
          totalTrades: 100,
          achievedAt: originalAchievedAt,
        },
        available_discounts: [],
      };

      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      const client = buildMockClient({
        tradeBadge: 'rookie_trader',
        existingNotifTypes: ['trade_milestone_100'],
        featureFlags: existingFlags,
        upsertSpy,
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      const saved = upsertSpy.mock.calls[0][0] as { feature_flags: { trade_badge: { achievedAt: string } } };
      // achievedAt must be the original value, not a fresh timestamp
      expect(saved.feature_flags.trade_badge.achievedAt).toBe(originalAchievedAt);
    });

    it('sets achievedAt on first achievement (no prior badge)', async () => {
      const before = new Date().toISOString();

      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      const client = buildMockClient({
        tradeBadge: null, // no badge yet
        existingNotifTypes: [],
        featureFlags: {},
        upsertSpy,
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      const saved = upsertSpy.mock.calls[0][0] as { feature_flags: { trade_badge: { achievedAt: string } } };
      const achievedAt = saved.feature_flags.trade_badge.achievedAt;
      // Should be a recent ISO timestamp
      expect(new Date(achievedAt).getTime()).toBeGreaterThanOrEqual(new Date(before).getTime());
    });
  });

  // ─── Early return: alpha_trader already earned ────────────────────────────

  describe('alpha_trader early return', () => {
    it('skips all DB writes when trade_badge is already alpha_trader', async () => {
      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      const client = buildMockClient({ tradeBadge: 'alpha_trader', upsertSpy });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      // getTotalExecutedTradeCount is called (it runs in Promise.all with the profile
      // query), but all DB writes should be skipped after the alpha early return
      expect(upsertSpy).not.toHaveBeenCalled();
    });
  });

  // ─── Batch notification inserts ───────────────────────────────────────────

  describe('batch notification inserts', () => {
    it('inserts only missing notifications (skips already-notified types)', async () => {
      mockedGetTotalTrades.mockResolvedValue(500); // crosses rookie + skilled + expert

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      const client = buildMockClient({
        tradeBadge: null,
        // rookie and skilled already notified — only expert is new
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
      mockedGetTotalTrades.mockResolvedValue(1000); // all 5 milestones

      const insertSpy = vi.fn().mockResolvedValue({ error: null });
      const client = buildMockClient({
        tradeBadge: null,
        existingNotifTypes: [], // none notified yet
        featureFlags: {},
        insertSpy,
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      // ONE call with an array of 5 rows — not 5 separate INSERT calls
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
      // Each row has the correct recipient
      inserted.forEach((row) => expect(row.recipient_id).toBe(PROFILE_ID));
    });
  });

  // ─── Early return: fewer than 100 trades ─────────────────────────────────

  describe('below first milestone threshold', () => {
    it('returns without any feature_flags write when user has fewer than 100 trades', async () => {
      mockedGetTotalTrades.mockResolvedValue(50);

      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      const client = buildMockClient({ tradeBadge: null, featureFlags: {}, upsertSpy });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      expect(upsertSpy).not.toHaveBeenCalled();
    });
  });

  // ─── available_discounts ordering ────────────────────────────────────────

  describe('available_discounts ordering', () => {
    it('rebuilds discounts in milestone order (rookie → alpha)', async () => {
      mockedGetTotalTrades.mockResolvedValue(500); // rookie + skilled + expert

      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      const client = buildMockClient({
        tradeBadge: null,
        existingNotifTypes: [],
        featureFlags: {},
        upsertSpy,
      });
      mockedCreateAdminClient.mockReturnValue(client as ReturnType<typeof createAdminClient>);

      await checkTradeMilestones(PROFILE_ID, USER_ID);

      const saved = upsertSpy.mock.calls[0][0] as { feature_flags: { available_discounts: Array<{ milestoneId: string }> } };
      expect(saved.feature_flags.available_discounts.map((d) => d.milestoneId)).toEqual([
        'rookie_trader',
        'skilled_trader',
        'expert_trader',
      ]);
    });
  });

  // ─── Non-fatal error handling ─────────────────────────────────────────────

  describe('error handling', () => {
    it('does not throw when supabase throws (non-fatal fire-and-forget)', async () => {
      mockedCreateAdminClient.mockReturnValue({
        from: vi.fn().mockImplementation(() => {
          throw new Error('DB connection lost');
        }),
      } as ReturnType<typeof createAdminClient>);

      // Should resolve (not reject) — errors are swallowed
      await expect(checkTradeMilestones(PROFILE_ID, USER_ID)).resolves.toBeUndefined();
    });
  });
});
