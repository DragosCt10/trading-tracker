import { redirect } from 'next/navigation';
import { getCachedUserSession } from '@/lib/server/session';
import { getTotalExecutedTradeCount } from '@/lib/server/tradeStats';
import { getFeatureFlags } from '@/lib/server/settings';
import { resolveSubscription } from '@/lib/server/subscription';
import { syncProLoyaltyNotification, syncUserBadge } from '@/lib/server/feedNotifications';
import { devSeedTestMilestone } from '@/lib/server/rewards';
import RewardsClient from './RewardsClient';

export const dynamic = 'force-dynamic';

export default async function RewardsPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams;
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  let totalTrades = 0;
  let featureFlags: Record<string, unknown> = {};
  let isPro = false;
  let proSinceDate: string | null = null;

  if (process.env.NODE_ENV === 'development') {
    await devSeedTestMilestone().catch(() => null);
  }

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
    await syncUserBadge(user.id, proSinceDate).catch(() => null);

    featureFlags = await getFeatureFlags(user.id);

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
