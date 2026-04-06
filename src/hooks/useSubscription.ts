import { resolveSubscription } from '@/lib/server/subscription';
import type { ResolvedSubscription, TierFeatureFlags } from '@/types/subscription';
import type { TierLimits } from '@/types/subscription';
import { useQuery } from '@tanstack/react-query';
import { SUBSCRIPTION_DATA } from '@/constants/queryConfig';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import { queryKeys } from '@/lib/queryKeys';

interface UseSubscriptionOptions {
  userId?: string;
  initialData?: ResolvedSubscription;
}

export function useSubscription({ userId, initialData }: UseSubscriptionOptions = {}) {
  const key = queryKeys.subscription(userId);

  const query = useQuery<ResolvedSubscription>({
    queryKey: key,
    enabled: !!userId,
    // When SSR initialData is provided, let staleTime govern revalidation.
    // Without it, always revalidate on mount so feature gates stay accurate.
    refetchOnMount: initialData ? true : 'always',
    initialData,
    // eslint-disable-next-line react-hooks/purity
    initialDataUpdatedAt: initialData ? Date.now() : undefined,
    ...SUBSCRIPTION_DATA,
    queryFn: async (): Promise<ResolvedSubscription> => {
      if (!userId) throw new Error('Cannot fetch subscription without userId');
      return resolveSubscription(userId);
    },
  });

  const starterSubscription: ResolvedSubscription = {
    tier: 'starter',
    definition: TIER_DEFINITIONS.starter,
    status: 'active',
    isActive: true,
    billingPeriod: null,
    periodEnd: null,
    cancelAtPeriodEnd: false,
    providerCustomerId: null,
    provider: 'admin',
    priceAmount: null,
    taxAmount: null,
    currency: null,
    createdAt: null,
  };

  const subscription = userId ? query.data : starterSubscription;
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
    isError: query.isError,
    hasFeature,
    withinLimit,
    refetchSubscription: query.refetch,
  };
}
