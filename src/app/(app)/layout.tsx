import AppLayout from '@/components/shared/layout/AppLayout';
import { getCachedAllAccountsForUser } from '@/lib/server/accounts';
import type { AccountRow, AccountMode } from '@/lib/server/accounts';
import { getCachedUserSession } from '@/lib/server/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { ReactNode } from 'react';
import { LAST_ACCOUNT_MODE_COOKIE, LAST_ACCOUNT_INDEX_COOKIE } from '@/constants/lastAccountCookie';

const VALID_MODES: AccountMode[] = ['live', 'demo', 'backtesting'];

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
  const initialAllAccounts = await getCachedAllAccountsForUser(userId);

  let initialActiveAccount: AccountRow | null = null;
  let initialActiveAccountMode: AccountMode = 'live';

  // Prefer last selection from cookie (mode + index only, no ids)
  const cookieStore = await cookies();
  const lastMode = cookieStore.get(LAST_ACCOUNT_MODE_COOKIE)?.value;
  const lastIndexStr = cookieStore.get(LAST_ACCOUNT_INDEX_COOKIE)?.value;
  if (lastMode && VALID_MODES.includes(lastMode as AccountMode)) {
    const accountsForMode = initialAllAccounts.filter((a) => a.mode === lastMode);
    const idx = lastIndexStr != null ? parseInt(lastIndexStr, 10) : 0;
    if (!Number.isNaN(idx) && idx >= 0 && idx < accountsForMode.length) {
      initialActiveAccount = accountsForMode[idx];
      initialActiveAccountMode = lastMode as AccountMode;
    }
  }

  // Fallback: live → demo → backtesting
  if (!initialActiveAccount) {
    const fallbackOrder: AccountMode[] = ['live', 'demo', 'backtesting'];
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
  }

  return (
    <AppLayout
      initialUserDetails={initialUserDetails}
      initialAllAccounts={initialAllAccounts}
      initialActiveAccount={initialActiveAccount}
      initialActiveAccountMode={initialActiveAccountMode}
    >
      {children}
    </AppLayout>
  );
}
