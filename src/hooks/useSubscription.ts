import { resolveSubscription } from '@/lib/server/subscription';
import type { ResolvedSubscription, TierFeatureFlags } from '@/types/subscription';
import type { TierLimits } from '@/types/subscription';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SUBSCRIPTION_DATA } from '@/constants/queryConfig';
import { queryKeys } from '@/lib/queryKeys';

interface UseSubscriptionOptions {
  userId?: string;
}

export function useSubscription({ userId }: UseSubscriptionOptions = {}) {
  const queryClient = useQueryClient();
  const key = queryKeys.subscription(userId);

  const cached = queryClient.getQueryData<ResolvedSubscription>(key);
  const shouldAutoFetch = !!userId && !cached;

  const query = useQuery<ResolvedSubscription>({
    queryKey: key,
    enabled: shouldAutoFetch,
    initialData: cached,
    ...SUBSCRIPTION_DATA,
    queryFn: async (): Promise<ResolvedSubscription> => {
      if (!userId) {
        // Return starter tier when no userId
        const { TIER_DEFINITIONS } = await import('@/constants/tiers');
        return {
          tier: 'starter',
          definition: TIER_DEFINITIONS.starter,
          status: 'active',
          isActive: true,
          billingPeriod: null,
          periodEnd: null,
          cancelAtPeriodEnd: false,
          providerCustomerId: null,
          provider: 'admin',
        };
      }
      return resolveSubscription(userId);
    },
  });

  const subscription = query.data;
  const tier = subscription?.tier ?? 'starter';
  const isPro = tier === 'pro' || tier === 'elite';
  const isElite = tier === 'elite';

  function hasFeature(flag: keyof TierFeatureFlags): boolean {
    return subscription?.definition.features[flag] === true;
  }

  function withinLimit(key: keyof TierLimits, currentCount: number): boolean {
    const max = subscription?.definition.limits[key];
    if (max === null || max === undefined) return true;
    if (typeof max === 'number') return currentCount < max;
    // allowedModes is an array — not a count-based limit
    return true;
  }

  return {
    subscription,
    tier,
    isPro,
    isElite,
    isLoading: query.isFetching && !subscription,
    isFetching: query.isFetching,
    hasFeature,
    withinLimit,
    refetchSubscription: query.refetch,
  };
}
