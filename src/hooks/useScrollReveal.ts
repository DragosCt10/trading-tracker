'use client';

import { useEffect, useRef } from 'react';

/**
 * Attaches an IntersectionObserver to `.scroll-reveal` children of the
 * returned ref. When a child enters the viewport it receives the
 * `scroll-reveal-visible` class which triggers the CSS animation in
 * globals.css. Once revealed, elements stay visible.
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-reveal-visible');
          } else {
            entry.target.classList.remove('scroll-reveal-visible');
          }
        }
      },
      { threshold: 0.15 },
    );

    const targets = root.querySelectorAll('.scroll-reveal');
    targets.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return ref;
}
