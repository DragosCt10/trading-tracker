import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import type { User } from '@supabase/supabase-js';
import { resolveActiveAccountFromCookies } from '@/lib/server/accounts';
import { getStrategyBySlug } from '@/lib/server/strategies';
import { resolveSubscription } from '@/lib/server/subscription';
import { AiVisionSkeleton } from '@/components/dashboard/ai-vision/AiVisionSkeleton';
import AiVisionClient from './AiVisionClient';

async function AiVisionDataFetcher({ user, strategySlug }: { user: User; strategySlug: string }) {
  const [{ mode, activeAccount }, subscription] = await Promise.all([
    resolveActiveAccountFromCookies(user.id),
    resolveSubscription(user.id),
  ]);

  const strategy = strategySlug
    ? await getStrategyBySlug(user.id, strategySlug, activeAccount?.id)
    : null;

  if (strategySlug && !strategy) {
    redirect('/stats');
  }

  return (
    <AiVisionClient
      userId={user.id}
      strategyId={strategy?.id ?? null}
      strategyName={strategy?.name ?? strategySlug}
      mode={mode}
      accountId={activeAccount?.id}
      accountBalance={activeAccount?.account_balance ?? 0}
      accountType={(activeAccount as { account_type?: string } | null)?.account_type === 'futures' ? 'futures' : 'standard'}
      initialSubscription={subscription}
    />
  );
}

interface AiVisionDataProps {
  user: User;
  strategySlug: string;
}

export default function AiVisionData({ user, strategySlug }: AiVisionDataProps) {
  return (
    <Suspense fallback={<AiVisionSkeleton />}>
      <AiVisionDataFetcher user={user} strategySlug={strategySlug} />
    </Suspense>
  );
}
