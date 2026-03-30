'use client';

import { useEffect, useRef } from 'react';

/**
 * Pricing page background adapted from the Web3 hero pattern.
 * Uses luminous gradient dome, hero-1 structural vertical border grid,
 * and a CSS box-shadow particle field in the header zone (same technique
 * as the landing page ParticleBackground).
 */

const LAYERS = [
  { count: 320, spread: 0.5, alpha: 0.25, duration: 50, dx: -80, dy: -60 },
  { count: 140, spread: 0.8, alpha: 0.45, duration: 35, dx: -60, dy: -100 },
  { count: 55,  spread: 1.2, alpha: 0.65, duration: 25, dx: -100, dy: -50 },
] as const;

function generateBoxShadow(count: number, spread: number, alpha: number): string {
  const shadows: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.round(Math.random() * 2560);
    const y = Math.round(Math.random() * 2560);
    shadows.push(`${x}px ${y}px 0 ${spread}px rgba(255,255,255,${alpha})`);
  }
  return shadows.join(',');
}

function PricingParticles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const fadeDelays = [0.2, 0.8, 1.4];

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
          pricing-drift-${i} ${layer.duration}s ease-in-out infinite alternate,
          pricing-fade-in 1.2s cubic-bezier(0.16,1,0.3,1) ${fadeDelays[i]}s forwards;
      `;
      container.appendChild(el);
    });
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden
      style={{
        position: 'absolute',
        insetInline: 0,
        top: 0,
        height: '32%',
        overflow: 'hidden',
        zIndex: 1,
        maskImage: 'linear-gradient(to bottom, white 20%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, white 20%, transparent 100%)',
      }}
    >
      <style>{`
        @keyframes pricing-drift-0 {
          from { transform: translate(0, 0) }
          to   { transform: translate(${LAYERS[0].dx}px, ${LAYERS[0].dy}px) }
        }
        @keyframes pricing-drift-1 {
          from { transform: translate(0, 0) }
          to   { transform: translate(${LAYERS[1].dx}px, ${LAYERS[1].dy}px) }
        }
        @keyframes pricing-drift-2 {
          from { transform: translate(0, 0) }
          to   { transform: translate(${LAYERS[2].dx}px, ${LAYERS[2].dy}px) }
        }
        @keyframes pricing-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="pricing-fade-in"] { animation: none !important; opacity: 1 !important; }
        }
      `}</style>
    </div>
  );
}

export function PricingHeroBackground() {

  return (
    <>
      <style>{`
        @keyframes pricing-glow-breathe {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.04); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pricing-glow-anim { animation: none !important; opacity: 0.3 !important; }
        }
      `}</style>

      {/* ── Particles — header zone only ── */}
      <PricingParticles />

      {/* ── Luminous gradient dome ── */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: [
            `radial-gradient(80% 55% at 50% 35%, color-mix(in oklch, var(--tc-primary) 35%, transparent) 0%, color-mix(in oklch, var(--tc-accent) 25%, transparent) 25%, color-mix(in oklch, var(--tc-primary) 10%, rgba(13,10,18,0.4)) 45%, rgba(13,10,18,0.85) 65%, #0d0a12 85%)`,
            `radial-gradient(70% 50% at 12% 0%, color-mix(in oklch, var(--tc-primary) 40%, transparent) 0%, color-mix(in oklch, var(--tc-accent) 20%, transparent) 30%, transparent 60%)`,
            `radial-gradient(60% 45% at 88% 20%, color-mix(in oklch, var(--tc-accent) 25%, transparent) 0%, transparent 55%)`,
            `linear-gradient(to bottom, rgba(13,10,18,0.3), transparent 40%)`,
          ].join(','),
          backgroundColor: '#0d0a12',
        }}
      />

      {/* ── Vignette edges ── */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(140% 120% at 50% 0%, transparent 55%, rgba(13,10,18,0.9))',
        }}
      />

      {/* ── Top radial shade (from hero-1) ── */}
      <div
        aria-hidden
        className="absolute inset-0 -top-14 hidden lg:block"
        style={{
          background: 'radial-gradient(35% 80% at 49% 0%, rgba(255,255,255,0.06), transparent)',
        }}
      />

      {/* ── Structural grid: bold outer borders at max-w-6xl edges ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mx-auto hidden w-full max-w-6xl lg:block"
      >
        {/* Left bold border */}
        <div
          className="absolute inset-y-0 left-0 z-10 h-full w-px"
          style={{
            background: 'rgba(255,255,255,0.12)',
            maskImage: 'linear-gradient(to bottom, white 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, white 80%, transparent 100%)',
          }}
        />
        {/* Right bold border */}
        <div
          className="absolute inset-y-0 right-0 z-10 h-full w-px"
          style={{
            background: 'rgba(255,255,255,0.12)',
            maskImage: 'linear-gradient(to bottom, white 80%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, white 80%, transparent 100%)',
          }}
        />
      </div>

      {/* ── Structural grid: inner content borders ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mx-auto w-full max-w-6xl"
      >
        {/* Outer pair — left */}
        <div
          className="absolute inset-y-0 left-4 w-px md:left-8"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08))',
          }}
        />
        {/* Outer pair — right */}
        <div
          className="absolute inset-y-0 right-4 w-px md:right-8"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08))',
          }}
        />
        {/* Inner pair — left */}
        <div
          className="absolute inset-y-0 left-8 w-px md:left-12"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04))',
          }}
        />
        {/* Inner pair — right */}
        <div
          className="absolute inset-y-0 right-8 w-px md:right-12"
          style={{
            background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.04) 30%, rgba(255,255,255,0.04))',
          }}
        />
      </div>

      {/* ── Central glow — breathing animation ── */}
      <div
        aria-hidden
        className="pricing-glow-anim pointer-events-none absolute left-1/2 top-[15%] h-48 w-64 -translate-x-1/2 rounded-full sm:h-56 sm:w-80"
        style={{
          background: `radial-gradient(ellipse, color-mix(in oklch, var(--tc-primary) 50%, transparent) 0%, color-mix(in oklch, var(--tc-accent) 30%, transparent) 40%, transparent 70%)`,
          filter: 'blur(60px)',
          animation: 'pricing-glow-breathe 8s ease-in-out infinite',
        }}
      />

    </>
  );
}
