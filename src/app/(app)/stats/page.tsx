import { redirect } from 'next/navigation';
import { StrategiesClient } from './StrategiesClient';
import { getCachedUserSession } from '@/lib/server/session';
import { resolveActiveAccount } from '@/lib/server/resolveActiveAccount';
import { getUserStrategies } from '@/lib/server/strategies';
import { getStrategiesOverview } from '@/lib/server/strategiesOverview';

export default async function StrategiesPage() {
  const { user } = await getCachedUserSession();

  if (!user) redirect('/login');

  const { account: initialActiveAccount, mode: initialMode } = await resolveActiveAccount(user.id);

  // Pre-fetch strategies and overview in parallel so StrategiesClient renders
  // immediately without skeleton. Both calls are safe — they return empty
  // values on error and the client will re-fetch if needed.
  const [initialStrategies, initialOverview] = initialActiveAccount
    ? await Promise.all([
        getUserStrategies(user.id, initialActiveAccount.id).catch(() => []),
        getStrategiesOverview(initialActiveAccount.id, initialMode).catch(() => ({})),
      ])
    : [[], {}];

  return (
    <StrategiesClient
      initialActiveAccount={initialActiveAccount}
      initialMode={initialMode}
      initialStrategies={initialStrategies}
      initialOverview={initialOverview}
    />
  );
}
