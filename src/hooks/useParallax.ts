import { useEffect, useRef } from 'react';

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

  // Keep params in a ref so the effect can read latest values without
  // re-subscribing (and without a variable-shape dep array that trips up
  // the React Compiler).
  const paramsRef = useRef({ entranceDelay, topAnchored, disableOnMobile });
  paramsRef.current = { entranceDelay, topAnchored, disableOnMobile };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { entranceDelay, topAnchored, disableOnMobile } = paramsRef.current;
    if (disableOnMobile && window.matchMedia('(max-width: 767px)').matches) return;

    const layout = { top: 0, height: 0 };
    let rafId = 0;

    const measure = () => {
      const section = sectionRef.current;
      if (!section) return;
      const rect = section.getBoundingClientRect();
      layout.top = rect.top + window.scrollY;
      layout.height = section.offsetHeight;
    };

    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const section = sectionRef.current;
        if (!section) return;

        const relativeScroll = topAnchored
          ? window.scrollY
          : Math.max(window.scrollY - layout.top, 0);
        const progress = Math.min(relativeScroll / layout.height, 1);

        const els = section.querySelectorAll<HTMLElement>('[data-parallax-speed]');
        els.forEach((el) => {
          const speed = parseFloat(el.dataset.parallaxSpeed || '0');
          const y = -(relativeScroll * speed);
          const opacity = Math.max(1 - progress * 1.8 * Math.abs(speed), 0);
          el.style.transform = `translateY(${y}px)`;
          el.style.opacity = String(opacity);
        });
      });
    };

    measure();
    window.addEventListener('resize', measure, { passive: true });

    const start = () => {
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

      measure();
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    };

    let timer = 0;
    if (entranceDelay > 0) {
      timer = window.setTimeout(start, entranceDelay);
    } else {
      start();
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return sectionRef;
}
