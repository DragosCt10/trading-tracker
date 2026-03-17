import { getCachedUserSession } from '@/lib/server/session';
import { resolveSubscription } from '@/lib/server/subscription';
import { redirect } from 'next/navigation';
import BillingClient from './BillingClient';

export const dynamic = 'force-dynamic';

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; feature?: string }>;
}) {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  const [subscription, resolvedSearch] = await Promise.all([
    resolveSubscription(user.id),
    searchParams,
  ]);

  return (
    <BillingClient
      subscription={subscription}
      justPaid={resolvedSearch.success === '1'}
      featureContext={resolvedSearch.feature}
    />
  );
}
