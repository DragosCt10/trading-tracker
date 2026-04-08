import { redirect } from 'next/navigation';
import { getCachedUserSession } from '@/lib/server/session';
import { getTotalExecutedTradeCount } from '@/lib/server/tradeStats';
import { resolveSubscription } from '@/lib/server/subscription';
import { syncProLoyaltyNotification, syncUserBadge } from '@/lib/server/feedNotifications';
import { devSeedTestMilestone } from '@/lib/server/rewards';
import type { FeatureFlags } from '@/types/featureFlags';
import RewardsClient from './RewardsClient';

export const dynamic = 'force-dynamic';

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  let totalTrades = 0;
  let featureFlags: FeatureFlags = {};
  let isPro = false;
  let proSinceDate: string | null = null;

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

    // Ensure milestone discounts are synced before reading flags — fixes the
    // race where checkTradeMilestones (fire-and-forget in insertTrade) hasn't
    // written yet by the time the user navigates here.
    // syncUserBadge returns the freshly-written flags — eliminates a second DB read
    featureFlags = await syncUserBadge(user.id, proSinceDate);

    // DEV ONLY: seed test_trader AFTER syncUserBadge so it always wins
    if (process.env.NODE_ENV === 'development') {
      featureFlags = await devSeedTestMilestone(featureFlags).catch(() => featureFlags);
    }

    // Page-load safety check: if pending_variant_revert is stale (>48h), auto-revert
    // Belt-and-suspenders fallback if webhook handler's 3 retry attempts all failed
    const pendingRevert = featureFlags.pending_variant_revert;
    if (pendingRevert?.appliedAt && pendingRevert.subscriptionId && pendingRevert.normalVariantId) {
      const appliedMs = new Date(pendingRevert.appliedAt).getTime();
      const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;
      if (Date.now() - appliedMs > FORTY_EIGHT_HOURS_MS) {
        try {
          const { getPaymentProvider } = await import('@/lib/billing');
          const provider = getPaymentProvider();
          await provider.switchSubscriptionVariant(pendingRevert.subscriptionId, pendingRevert.normalVariantId);
          const { updateFeatureFlags } = await import('@/lib/server/settings');
          await updateFeatureFlags(user.id, { ...featureFlags, pending_variant_revert: null });
          featureFlags = { ...featureFlags, pending_variant_revert: null };
          console.log(`[RewardsPage] stale_variant_reverted userId=${user.id}`);
        } catch (revertErr) {
          console.error('[RewardsPage] safety_revert failed (non-fatal):', revertErr);
        }
      }
    }

    // Fire PRO loyalty notification (non-blocking)
    if (isPro) void syncProLoyaltyNotification(user.id, proSinceDate);
  } catch (err) {
    console.error('[RewardsPage] fetch error (non-fatal):', err);
  }

  return (
    <RewardsClient
      totalTrades={totalTrades}
      featureFlags={featureFlags}
      isPro={isPro}
      proSinceDate={proSinceDate}
      showBackToSettings={from === 'settings'}
    />
  );
}
