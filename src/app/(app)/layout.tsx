import AppLayout from '@/components/shared/layout/AppLayout';
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

  return (
    <AppLayout initialUserDetails={initialUserDetails}>
      {children}
    </AppLayout>
  );
}
