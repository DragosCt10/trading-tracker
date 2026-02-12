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
    <div className="mt-40 max-w-(--breakpoint-xl) mx-auto">
      <Navbar />
      {children}
    </div>
    </>
  );
}
