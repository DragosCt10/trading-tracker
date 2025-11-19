'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

const client = new QueryClient({
  defaultOptions: {
    queries: {
      // v5 names
      // gcTime: Infinity,          // never garbage-collect
      // staleTime: Infinity,       // never mark stale (no auto refetch)
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