import { redirect } from 'next/navigation';
import { getCachedUserSession } from '@/lib/server/session';
import { resolveSubscription } from '@/lib/server/subscription';
import { getCachedSocialProfile } from '@/lib/server/socialProfile';
import SettingsClient from './SettingsClient';

export const dynamic = 'force-dynamic';

type SettingsTab = 'billing' | 'account' | 'profile';

function normalizeTab(tab?: string): SettingsTab {
  if (tab === 'account') return 'account';
  if (tab === 'profile') return 'profile';
  return 'billing';
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; success?: string; feature?: string }>;
}) {
  const [{ user }, resolvedSearch] = await Promise.all([getCachedUserSession(), searchParams]);
  if (!user) redirect('/login');

  const tab = normalizeTab(resolvedSearch.tab);

  const [subscription, socialProfile] = await Promise.all([
    resolveSubscription(user.id),
    getCachedSocialProfile(user.id),
  ]);

  return (
    <SettingsClient
      initialTab={tab}
      subscription={subscription}
      justPaid={resolvedSearch.success === '1'}
      featureContext={resolvedSearch.feature}
      userEmail={user.email ?? ''}
      userId={user.id}
      socialProfile={socialProfile}
    />
  );
}
