import AppLayout from '@/components/shared/layout/AppLayout';
import { getCachedAllAccountsForUser, ensureDefaultAccount } from '@/lib/server/accounts';
import { getCachedUserSession } from '@/lib/server/session';
import { resolveSubscription } from '@/lib/server/subscription';
import { resolveActiveAccount } from '@/lib/server/resolveActiveAccount';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export default async function AppLayoutComponent({ children }: AppLayoutProps) {
  const initialUserDetails = await getCachedUserSession();

  if (!initialUserDetails.user || !initialUserDetails.session) {
    redirect('/login');
  }

  const userId = initialUserDetails.user.id;

  // Ensure user always has at least one demo account (no-op if accounts already exist)
  await ensureDefaultAccount();

  // Parallel fetches — subscription resolves independently of accounts
  const [initialAllAccounts, initialSubscription, { account: initialActiveAccount, mode: initialActiveAccountMode }] =
    await Promise.all([
      getCachedAllAccountsForUser(userId),
      resolveSubscription(userId),
      resolveActiveAccount(userId),
    ]);

  return (
    <AppLayout
      initialUserDetails={initialUserDetails}
      initialAllAccounts={initialAllAccounts}
      initialActiveAccount={initialActiveAccount}
      initialActiveAccountMode={initialActiveAccountMode}
      initialSubscription={initialSubscription}
    >
      {children}
    </AppLayout>
  );
}
