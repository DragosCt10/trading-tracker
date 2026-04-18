import { redirect } from 'next/navigation';
import { getCachedUserSession } from '@/lib/server/session';
import { getCachedAllAccountsForUser } from '@/lib/server/accounts';
import { resolveSubscription } from '@/lib/server/subscription';
import { TradeLedgerClient } from './TradeLedgerClient';

export const metadata = {
  title: 'Trade Ledger · Alpha Stats',
  description: 'Banking-style PDF reports of your trading activity.',
};

export default async function TradeLedgerPage() {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login?redirectTo=/trade-ledger');

  const [accounts, subscription] = await Promise.all([
    getCachedAllAccountsForUser(user.id),
    resolveSubscription(user.id),
  ]);

  const hasAccess = subscription.definition.features.tradeLedger;

  return (
    <TradeLedgerClient
      userId={user.id}
      accounts={accounts}
      hasAccess={hasAccess}
      tierLabel={subscription.definition.label}
    />
  );
}
