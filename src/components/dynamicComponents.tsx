'use client';

import dynamic from 'next/dynamic';

/**
 * Single place for client dynamic imports. Keeps code-splitting in one module
 * and avoids duplicate dynamic() setup across the app.
 */
export const NewTradeModal = dynamic(() => import('@/components/NewTradeModal'), {
  ssr: false,
  loading: () => null,
});

export const MarkdownRenderer = dynamic(() => import('@/components/shared/MarkdownRenderer'), {
  ssr: false,
});
