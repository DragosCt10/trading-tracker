import { useState, useEffect } from 'react';

/**
 * Cycles through indices on a timer with a brief transition state.
 *
 * @param itemCount  Total number of items to cycle through
 * @param intervalMs Time between cycles (default 4000ms)
 * @param transitionMs Duration of the transition fade (default 300ms)
 * @returns { activeIndex, isTransitioning }
 */
export function useCycleAnimation(
  itemCount: number,
  intervalMs = 4000,
  transitionMs = 300,
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const intervalId = setInterval(() => {
      setIsTransitioning(true);
      timeoutId = setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % itemCount);
        setIsTransitioning(false);
      }, transitionMs);
    }, intervalMs);
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [itemCount, intervalMs, transitionMs]);

  return { activeIndex, isTransitioning };
}
