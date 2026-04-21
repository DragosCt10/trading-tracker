import { useEffect, useRef, useCallback } from 'react';

/**
 * Attaches a parallax scroll effect to all elements with `data-parallax-speed`
 * inside the given section ref. Speed controls how fast the element moves
 * relative to scroll, and opacity fades proportionally.
 *
 * @param entranceDelay — ms to wait before enabling parallax (lets entrance
 *   animations finish). Default 0 (no entrance animations).
 * @param topAnchored — when true, parallax progresses with `window.scrollY`
 *   directly (starts reacting from pixel 0) instead of waiting for the
 *   section to reach the viewport top. Use for the first section of the
 *   page (e.g. the hero) so parallax reacts immediately, even when there's
 *   a banner or sticky header above it. Default false.
 * @param disableOnMobile — when true, parallax is skipped on viewports
 *   ≤ 767px so mobile users get static, snappier scrolling. Default false.
 */
export function useParallax(entranceDelay = 0, topAnchored = false, disableOnMobile = false) {
  const sectionRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number>(0);
  const layoutRef = useRef({ top: 0, height: 0 });

  const measure = useCallback(() => {
    const section = sectionRef.current;
    if (!section) return;
    const rect = section.getBoundingClientRect();
    layoutRef.current = {
      top: rect.top + window.scrollY,
      height: section.offsetHeight,
    };
  }, []);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const section = sectionRef.current;
      if (!section) return;

      const { top, height } = layoutRef.current;
      const relativeScroll = topAnchored
        ? window.scrollY
        : Math.max(window.scrollY - top, 0);
      const progress = Math.min(relativeScroll / height, 1);

      const els = section.querySelectorAll<HTMLElement>('[data-parallax-speed]');
      els.forEach((el) => {
        const speed = parseFloat(el.dataset.parallaxSpeed || '0');
        const y = -(relativeScroll * speed);
        const opacity = Math.max(1 - progress * 1.8 * Math.abs(speed), 0);
        el.style.transform = `translateY(${y}px)`;
        el.style.opacity = String(opacity);
      });
    });
  }, [topAnchored]);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (disableOnMobile && window.matchMedia('(max-width: 767px)').matches) return;

    // Measure immediately so scroll calculations are always correct,
    // even if the user scrolls before entrance animations finish.
    measure();
    window.addEventListener('resize', measure, { passive: true });

    const timer = setTimeout(() => {
      const section = sectionRef.current;
      if (!section) return;

      if (entranceDelay > 0) {
        const els = section.querySelectorAll<HTMLElement>('[data-parallax-speed]');
        els.forEach((el) => {
          el.style.animation = 'none';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';
          el.style.filter = 'blur(0)';
        });
      }

      measure(); // Re-measure after animations settle
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }, entranceDelay);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(rafRef.current);
    };
  }, [onScroll, measure, entranceDelay, disableOnMobile]);

  return sectionRef;
}
