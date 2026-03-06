'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

const ONE_MINUTE = 60_000;

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ONE_MINUTE, // default: avoid redundant refetches for queries that don't set staleTime
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: false,
    },
  },
});

export default function QueryProvider({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}