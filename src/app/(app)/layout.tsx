import AppLayout from '@/components/shared/layout/AppLayout';
import { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AppLayoutComponent({ children }: AppLayoutProps) {  
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}
