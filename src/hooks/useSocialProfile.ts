import { useQuery } from '@tanstack/react-query';
import { getCachedSocialProfile } from '@/lib/server/socialProfile';
import { queryKeys } from '@/lib/queryKeys';
import { SOCIAL_PROFILE_DATA } from '@/constants/queryConfig';

export function useSocialProfile(userId?: string) {
  return useQuery({
    queryKey: queryKeys.socialProfile(userId),
    queryFn: () => getCachedSocialProfile(userId!),
    enabled: !!userId,
    ...SOCIAL_PROFILE_DATA,
  });
}
