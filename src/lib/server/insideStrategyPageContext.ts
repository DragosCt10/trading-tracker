import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getCachedUserSession } from '@/lib/server/session';

type InsideStrategyPageParams = Promise<{ strategy: string }>;

export async function getInsideStrategyPageContext(params: InsideStrategyPageParams): Promise<{
  user: User;
  strategySlug: string;
}> {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  const resolvedParams = await params;
  return {
    user,
    strategySlug: decodeURIComponent(resolvedParams.strategy),
  };
}
