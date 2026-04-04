'use client';

import { useEffect, useRef } from 'react';
import { generateBoxShadow } from '@/utils/generateBoxShadow';

/**
 * CSS-only starfield. Three layers of box-shadow dots drift slowly via
 * GPU-accelerated CSS animations. Near-zero CPU cost vs canvas.
 * Generated client-side only to avoid hydration mismatch from Math.random.
 */

const LAYERS = [
  { count: 450, spread: 0.5, alpha: 0.3, duration: 50, dx: -80, dy: -60 },
  { count: 200, spread: 0.8, alpha: 0.5, duration: 35, dx: -60, dy: -100 },
  { count: 80, spread: 1.2, alpha: 0.7, duration: 25, dx: -100, dy: -50 },
] as const;


export function ParticleBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Stagger delays: sparse fast stars first, then dense slow ones
    const fadeDelays = [0.2, 0.8, 1.4];
    const elements: HTMLDivElement[] = [];

    LAYERS.forEach((layer, i) => {
      const el = document.createElement('div');
      el.style.cssText = `
        position:absolute;
        top:0;
        left:0;
        width:1px;
        height:1px;
        border-radius:50%;
        background:transparent;
        will-change:transform;
        opacity:0;
        box-shadow:${generateBoxShadow(layer.count, layer.spread, layer.alpha)};
        animation:
          particle-drift-${i} ${layer.duration}s ease-in-out infinite alternate,
          particle-fade-in 1.2s cubic-bezier(0.16,1,0.3,1) ${fadeDelays[i]}s forwards;
      `;
      container.appendChild(el);
      elements.push(el);
    });

    return () => {
      elements.forEach((el) => el.remove());
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        maskImage: 'linear-gradient(to bottom, white 55%, transparent 95%)',
        WebkitMaskImage: 'linear-gradient(to bottom, white 55%, transparent 95%)',
      }}
    >
      <style>{`
        @keyframes particle-drift-0 {
          from { transform: translate(0, 0) }
          to   { transform: translate(${LAYERS[0].dx}px, ${LAYERS[0].dy}px) }
        }
        @keyframes particle-drift-1 {
          from { transform: translate(0, 0) }
          to   { transform: translate(${LAYERS[1].dx}px, ${LAYERS[1].dy}px) }
        }
        @keyframes particle-drift-2 {
          from { transform: translate(0, 0) }
          to   { transform: translate(${LAYERS[2].dx}px, ${LAYERS[2].dy}px) }
        }
        @keyframes particle-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="particle-fade-in"] { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}
