import AppLayout from '@/components/shared/layout/AppLayout';
import { ReactNode } from 'react';

interface TradesLayout {
  children: ReactNode;
  title?: string;
}

export default function TradesLayout({ children }: TradesLayout) {  
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}
