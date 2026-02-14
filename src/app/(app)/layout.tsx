import AppLayout from '@/components/shared/layout/AppLayout';
import { getActiveAccountForMode, getAccountsForMode } from '@/lib/server/accounts';
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
  const [initialAccountsForLive, initialActiveAccountForLive] = await Promise.all([
    getAccountsForMode(userId, 'live'),
    getActiveAccountForMode(userId, 'live'),
  ]);

  return (
    <AppLayout
      initialUserDetails={initialUserDetails}
      initialAccountsForLive={initialAccountsForLive}
      initialActiveAccountForLive={initialActiveAccountForLive}
    >
      {children}
    </AppLayout>
  );
}
