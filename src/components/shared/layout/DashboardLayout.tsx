import React, { ReactNode } from 'react';
import Navbar from '@/components/navigation/Navbar';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {  
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
