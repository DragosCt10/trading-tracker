"use client";

import { ReactNode } from 'react';
import Navbar from '@/components/navigation/Navbar';
interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AppLayout({ children }: AppLayoutProps) {  
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
