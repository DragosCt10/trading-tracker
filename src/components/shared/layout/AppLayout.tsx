"use client";

import { useQueryClient } from '@tanstack/react-query';
import { ReactNode } from 'react';
import Navbar from '@/components/navigation/Navbar';

export type InitialUserDetails = { user: { id: string } | null; session: object | null };

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  initialUserDetails?: InitialUserDetails;
}

export default function AppLayout({ children, initialUserDetails }: AppLayoutProps) {
  const queryClient = useQueryClient();
  // Hydrate user details cache so Navbar and all useUserDetails() consumers get data on first paint (no flash)
  if (initialUserDetails != null && queryClient.getQueryData(['userDetails']) === undefined) {
    queryClient.setQueryData(['userDetails'], initialUserDetails);
  }

  return (
    <>
      <div className="mt-40 max-w-(--breakpoint-xl) mx-auto">
        <Navbar />
        {children}
      </div>
    </>
  );
}
