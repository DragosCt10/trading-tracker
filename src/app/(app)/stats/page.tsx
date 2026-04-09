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
  // immediately without skeleton. Failures fall back to empty values so the
  // shell still renders — but we must log so regressions are detectable.
  const [initialStrategies, initialOverview] = initialActiveAccount
    ? await Promise.all([
        getUserStrategies(user.id, initialActiveAccount.id).catch((err) => {
          console.error('[stats/page] getUserStrategies prefetch failed', err);
          return [];
        }),
        getStrategiesOverview(initialActiveAccount.id, initialMode).catch((err) => {
          console.error('[stats/page] getStrategiesOverview prefetch failed', err);
          return {};
        }),
      ])
    : [[], {}];

  return (
    <StrategiesClient
      initialUserId={user.id}
      initialActiveAccount={initialActiveAccount}
      initialMode={initialMode}
      initialStrategies={initialStrategies}
      initialOverview={initialOverview}
    />
  );
}
