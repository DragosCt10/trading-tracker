import AppLayout from '@/components/shared/layout/AppLayout';
import { ReactNode } from 'react';

interface DiscoverLayoutProps {
  children: ReactNode;
}

export default function DiscoverLayout({ children }: DiscoverLayoutProps) {  
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}
