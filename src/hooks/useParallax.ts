import { useEffect, useRef, useCallback } from 'react';

/**
 * Attaches a parallax scroll effect to all elements with `data-parallax-speed`
 * inside the given section ref. Speed controls how fast the element moves
 * relative to scroll, and opacity fades proportionally.
 *
 * @param entranceDelay — ms to wait before enabling parallax (lets entrance
 *   animations finish). Default 0 (no entrance animations).
 */
export function useParallax(entranceDelay = 0) {
  const sectionRef = useRef<HTMLElement>(null);
  const rafRef = useRef<number>(0);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const section = sectionRef.current;
      if (!section) return;

      const scrollY = window.scrollY;
      const rect = section.getBoundingClientRect();
      const sectionTop = scrollY + rect.top;
      const sectionH = section.offsetHeight;
      const relativeScroll = Math.max(scrollY - sectionTop, 0);
      const progress = Math.min(relativeScroll / sectionH, 1);

      const els = section.querySelectorAll<HTMLElement>('[data-parallax-speed]');
      els.forEach((el) => {
        const speed = parseFloat(el.dataset.parallaxSpeed || '0');
        const y = -(relativeScroll * speed);
        const opacity = Math.max(1 - progress * 1.8 * Math.abs(speed), 0);
        el.style.transform = `translateY(${y}px)`;
        el.style.opacity = String(opacity);
      });
    });
  }, []);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }, entranceDelay);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [onScroll, entranceDelay]);

  return sectionRef;
}
