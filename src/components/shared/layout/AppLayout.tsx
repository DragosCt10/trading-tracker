"use client";

import React, { ReactNode } from 'react';
import Navbar from '@/components/navigation/Navbar';
import BottomActionBar from '../BottomActionBar';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function AppLayout({ children }: AppLayoutProps) {  
  return (
    <>
      <Navbar />
      {children}
      <BottomActionBar
        mode={'live'}
        accounts={[]}
        selectedAccountId={''}
        onChangeAccount={(accountId: string) => {
          // Handle account change logic here
          console.log('Account changed to:', accountId);
        }}
        onApply={() => {
          // run your manual refetch / apply logic here
          // e.g. refetch queries using the selected account
          console.log('Apply with account:', '');
        }}
        onEdit={() => {
          // open a modal / navigate to settings
          console.log('Edit pressed');
        }}
      />
    </>
  );
}
