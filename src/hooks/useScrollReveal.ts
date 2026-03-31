'use client';

import { useEffect, useRef } from 'react';

/**
 * Attaches an IntersectionObserver to `.scroll-reveal` children of the
 * returned ref. When a child enters the viewport it receives the
 * `scroll-reveal-visible` class which triggers the CSS animation.
 *
 * By default, the class is removed when the element leaves the viewport
 * (with a 200px buffer) so the animation replays on scroll-back.
 *
 * Add `.scroll-reveal-once` to make an element reveal only once (stays visible).
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const revealed = new Set<Element>();

    // Triggers reveal at 15% visibility
    const enterObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('scroll-reveal-visible');
            if (entry.target.classList.contains('scroll-reveal-once')) {
              revealed.add(entry.target);
              enterObserver.unobserve(entry.target);
            }
          }
        }
      },
      { threshold: 0.15 },
    );

    // Removes class only when element is 200px off-screen
    const exitObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting && !revealed.has(entry.target)) {
            entry.target.classList.remove('scroll-reveal-visible');
          }
        }
      },
      { rootMargin: '200px' },
    );

    const targets = root.querySelectorAll('.scroll-reveal');
    targets.forEach((el) => {
      enterObserver.observe(el);
      if (!el.classList.contains('scroll-reveal-once')) {
        exitObserver.observe(el);
      }
    });

    return () => {
      enterObserver.disconnect();
      exitObserver.disconnect();
    };
  }, []);

  return ref;
}
