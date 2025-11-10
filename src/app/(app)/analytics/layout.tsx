import AppLayout from '@/components/shared/layout/AppLayout';
import { ReactNode } from 'react';

interface AnalyticsLayout {
  children: ReactNode;
  title?: string;
}

export default function AnalyticsLayout({ children }: AnalyticsLayout) {  
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}
