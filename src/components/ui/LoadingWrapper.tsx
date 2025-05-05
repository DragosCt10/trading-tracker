'use client';

import { ReactNode } from 'react';
import { useLoading } from '@/context/LoadingContext';
import Loader from './Loader';

export default function LoadingWrapper({ children }: { children: ReactNode }) {
  const { isLoading } = useLoading();

  return (
    <>
      {isLoading && <Loader />}
      {children}
    </>
  );
} 