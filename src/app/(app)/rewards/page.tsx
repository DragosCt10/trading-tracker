import { redirect } from 'next/navigation';
import { getCachedUserSession } from '@/lib/server/session';
import { getTotalExecutedTradeCount } from '@/lib/server/tradeStats';
import { getFeatureFlags } from '@/lib/server/settings';
import { resolveSubscription, createPortalUrl } from '@/lib/server/subscription';
import { syncProLoyaltyNotification } from '@/lib/server/feedNotifications';
import RewardsClient from './RewardsClient';

export const dynamic = 'force-dynamic';

export default async function RewardsPage() {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  let totalTrades = 0;
  let featureFlags: Record<string, unknown> = {};
  let isPro = false;
  let portalUrl: string | null = null;
  let proSinceDate: string | null = null;

  try {
    const [[trades, flags], subscription] = await Promise.all([
      Promise.all([
        getTotalExecutedTradeCount(user.id),
        getFeatureFlags(user.id),
      ]),
      resolveSubscription(user.id).catch(() => null),
    ]);
    totalTrades = trades;
    featureFlags = flags;
    if (subscription) {
      isPro = subscription.tier === 'pro' || subscription.tier === 'elite';
      proSinceDate = subscription.createdAt;
      if (isPro) portalUrl = await createPortalUrl().catch(() => null);
    }
    // Fire 3-month PRO loyalty notification (non-blocking, runs after main data)
    if (isPro) void syncProLoyaltyNotification(user.id, proSinceDate);
  } catch (err) {
    console.error('[RewardsPage] fetch error (non-fatal):', err);
  }

  return (
    <RewardsClient
      totalTrades={totalTrades}
      featureFlags={featureFlags}
      isPro={isPro}
      portalUrl={portalUrl}
      proSinceDate={proSinceDate}
    />
  );
}
