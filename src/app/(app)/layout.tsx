import AppLayout from '@/components/shared/layout/AppLayout';
import { getAccountsForMode, getAllAccountsForUser } from '@/lib/server/accounts';
import type { AccountRow, AccountMode } from '@/lib/server/accounts';
import { getCachedUserSession } from '@/lib/server/trades';
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
  const [initialAccountsForLive, initialAllAccounts] = await Promise.all([
    getAccountsForMode(userId, 'live'),
    getAllAccountsForUser(userId),
  ]);

  // Determine initial active account with fallback: live → demo → backtesting
  const fallbackOrder: AccountMode[] = ['live', 'demo', 'backtesting'];
  let initialActiveAccount: AccountRow | null = null;
  let initialActiveAccountMode: AccountMode = 'live';

  for (const mode of fallbackOrder) {
    const found =
      initialAllAccounts.find((a) => a.mode === mode && a.is_active) ??
      initialAllAccounts.find((a) => a.mode === mode);
    if (found) {
      initialActiveAccount = found;
      initialActiveAccountMode = mode;
      break;
    }
  }

  return (
    <AppLayout
      initialUserDetails={initialUserDetails}
      initialAccountsForLive={initialAccountsForLive}
      initialAllAccounts={initialAllAccounts}
      initialActiveAccount={initialActiveAccount}
      initialActiveAccountMode={initialActiveAccountMode}
    >
      {children}
    </AppLayout>
  );
}
