import { redirect } from 'next/navigation';
import { getCachedUserSession } from '@/lib/server/session';
import { resolveSubscription } from '@/lib/server/subscription';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

type SettingsTab = 'billing' | 'account';

function normalizeTab(tab?: string): SettingsTab {
  if (tab === 'account') return 'account';
  return 'billing';
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; success?: string; feature?: string }>;
}) {
  const [{ user }, resolvedSearch] = await Promise.all([getCachedUserSession(), searchParams]);
  if (!user) redirect('/login');

  const subscription = await resolveSubscription(user.id);

  return (
    <SettingsClient
      initialTab={normalizeTab(resolvedSearch.tab)}
      subscription={subscription}
      justPaid={resolvedSearch.success === '1'}
      featureContext={resolvedSearch.feature}
      userEmail={user.email ?? ''}
    />
  );
}
