'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { ReactNode } from 'react';

const ONE_MINUTE = 60_000;
// Match gcTime so localStorage data is discarded when it's no longer useful in memory.
const PERSIST_MAX_AGE = 15 * ONE_MINUTE;

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ONE_MINUTE,
      gcTime: PERSIST_MAX_AGE, // keep data in memory for up to 15 min (matches persister maxAge)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: false,
    },
  },
});

// Only persist small, fast-to-restore stat blobs — never large trade arrays.
//   dashboardStats: ~50 KB per entry (all stat categories, no series/trades)
//   calendarTrades: ~50-200 KB per month (full trade objects for one month)
// Trade arrays (filteredTrades, allTrades) are intentionally excluded — can be
// 10-50 MB for large accounts and are re-fetched in parallel with stats anyway.
const PERSIST_QUERY_KEYS = new Set(['dashboardStats', 'calendarTrades']);

// Wrap localStorage as an async storage adapter (same interface as AsyncStorage).
// Guard with typeof window to avoid SSR errors in Next.js.
const asyncLocalStorage =
  typeof window !== 'undefined'
    ? {
        getItem: (key: string) => Promise.resolve(window.localStorage.getItem(key)),
        setItem: (key: string, value: string) =>
          Promise.resolve(window.localStorage.setItem(key, value)),
        removeItem: (key: string) => Promise.resolve(window.localStorage.removeItem(key)),
      }
    : null;

// Build persister once at module level so it isn't recreated on every render.
const persister = asyncLocalStorage
  ? createAsyncStoragePersister({
      storage: asyncLocalStorage,
      key: 'tt-query-cache',
      // Throttle writes to 2 s so rapid filter changes don't thrash localStorage.
      throttleTime: 2000,
    })
  : null;

interface ProvidersProps {
  children: ReactNode;
}

export default function QueryProvider({ children }: ProvidersProps) {
  // SSR / no-storage fallback: render without persistence
  if (!persister) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE,
        // Only dehydrate (save to localStorage) the small stat blobs.
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            PERSIST_QUERY_KEYS.has(query.queryKey[0] as string),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
