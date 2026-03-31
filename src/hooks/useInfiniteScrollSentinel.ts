import { useRef, useCallback } from 'react';

/**
 * Returns a ref callback to attach to a sentinel element at the bottom of an
 * infinite list. When the sentinel enters the viewport, `fetchNextPage` is
 * called automatically.
 */
export function useInfiniteScrollSentinel(
  fetchNextPage: () => void,
  hasNextPage: boolean,
  isFetchingNextPage: boolean
): (node: HTMLDivElement | null) => void {
  const observerRef = useRef<IntersectionObserver | null>(null);

  return useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasNextPage || isFetchingNextPage) return;
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      });
      observerRef.current.observe(node);
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );
}
