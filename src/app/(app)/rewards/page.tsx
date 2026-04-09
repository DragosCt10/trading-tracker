import { redirect } from 'next/navigation';
import { getCachedUserSession } from '@/lib/server/session';
import { getTotalExecutedTradeCount } from '@/lib/server/tradeStats';
import { resolveSubscription } from '@/lib/server/subscription';
import { syncProLoyaltyNotification, syncUserBadge } from '@/lib/server/feedNotifications';
import { devSeedTestMilestone } from '@/lib/server/rewards';
import { getUserDiscounts, clearPendingRevert } from '@/lib/server/discounts';
import type { UserDiscount } from '@/types/userDiscount';
import RewardsClient from './RewardsClient';

export const dynamic = 'force-dynamic';

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  let totalTrades = 0;
  let isPro = false;
  let proSinceDate: string | null = null;
  let discounts: UserDiscount[] = [];

  try {
    const [trades, subscription] = await Promise.all([
      getTotalExecutedTradeCount(user.id),
      resolveSubscription(user.id).catch(() => null),
    ]);
    totalTrades = trades;
    if (subscription) {
      isPro = subscription.tier === 'pro' || subscription.tier === 'elite';
      proSinceDate = subscription.createdAt;
    }

    // Ensure milestone discounts are synced before reading — fixes the race
    // where checkTradeMilestones (fire-and-forget in insertTrade) hasn't
    // written yet by the time the user navigates here.
    // Then fetch discounts in parallel (syncUserBadge writes, getUserDiscounts reads).
    await syncUserBadge(user.id, proSinceDate);

    // DEV ONLY: seed test_trader AFTER syncUserBadge so it always wins
    if (process.env.NODE_ENV === 'development') {
      await devSeedTestMilestone().catch(() => undefined);
    }

    discounts = await getUserDiscounts(user.id);

    // Page-load safety check: if a pending_variant_revert is stale (>48h), auto-revert.
    // Belt-and-suspenders fallback if webhook handler's 3 retry attempts all failed.
    const stale = discounts.find(
      (d) =>
        d.revertAppliedAt &&
        d.revertSubscriptionId &&
        d.revertNormalVariantId &&
        Date.now() - new Date(d.revertAppliedAt).getTime() > 48 * 60 * 60 * 1000,
    );
    if (stale && stale.revertSubscriptionId && stale.revertNormalVariantId) {
      try {
        const { getPaymentProvider } = await import('@/lib/billing');
        const provider = getPaymentProvider();
        await provider.switchSubscriptionVariant(stale.revertSubscriptionId, stale.revertNormalVariantId);
        await clearPendingRevert(stale.id);
        // Refresh the local copy so the client renders the cleared state
        discounts = discounts.map((d) =>
          d.id === stale.id
            ? {
                ...d,
                used: true,
                revertSubscriptionId: null,
                revertNormalVariantId: null,
                revertDiscountedVariantId: null,
                revertAppliedAt: null,
                revertAttempts: 0,
              }
            : d,
        );
        console.log(`[RewardsPage] stale_variant_reverted userId=${user.id}`);
      } catch (revertErr) {
        console.error('[RewardsPage] safety_revert failed (non-fatal):', revertErr);
      }
    }

    // Fire PRO loyalty notification (non-blocking)
    if (isPro) void syncProLoyaltyNotification(user.id, proSinceDate);
  } catch (err) {
    console.error('[RewardsPage] fetch error (non-fatal):', err);
  }

  // Split discounts into milestone / retention / (activity is consumed on the feed page)
  const milestoneDiscounts = discounts.filter((d) => d.discountType === 'milestone');
  const retentionDiscount =
    discounts.find((d) => d.discountType === 'retention') ?? null;

  // If any discount has a pending revert, surface its id so the client can render
  // "Discount applied" state (keyed by discountId — milestoneId or 'retention' / 'activity').
  const pendingRevert = discounts.find((d) => d.revertSubscriptionId);
  const pendingRevertDiscountId = pendingRevert
    ? pendingRevert.discountType === 'milestone'
      ? pendingRevert.milestoneId
      : pendingRevert.discountType
    : null;

  return (
    <RewardsClient
      totalTrades={totalTrades}
      milestoneDiscounts={milestoneDiscounts}
      retentionDiscount={retentionDiscount}
      pendingRevertDiscountId={pendingRevertDiscountId}
      isPro={isPro}
      proSinceDate={proSinceDate}
      showBackToSettings={from === 'settings'}
    />
  );
}
