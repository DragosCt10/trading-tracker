'use client';

/**
 * Pricing page background.
 * Uses luminous gradient dome and hero-1 structural vertical border grid.
 * Supports both light and dark modes via CSS custom properties.
 */

export function PricingHeroBackground() {
  return (
    /* Sticky wrapper: h-0 keeps it out of flow, inner h-screen fills viewport.
       As you scroll, the entire background stays pinned to the viewport. */
    <div className="sticky top-0 h-0" style={{ zIndex: 0 }}>
      <div className="relative h-screen w-full" aria-hidden>

        <style>{`
          /* Theme-adaptive tokens for pricing background */
          .pricing-bg-root {
            --pricing-base: #ffffff;
            --pricing-base-rgb: 255,255,255;
            --pricing-grid-strong: rgba(0,0,0,0.07);
            --pricing-grid-medium: rgba(0,0,0,0.05);
            --pricing-grid-light: rgba(0,0,0,0.03);
            --pricing-vignette: rgba(255,255,255,0.85);
          }
          :is(.dark) .pricing-bg-root {
            --pricing-base: #0d0a12;
            --pricing-base-rgb: 13,10,18;
            --pricing-grid-strong: rgba(255,255,255,0.12);
            --pricing-grid-medium: rgba(255,255,255,0.08);
            --pricing-grid-light: rgba(255,255,255,0.04);
            --pricing-vignette: rgba(13,10,18,0.9);
          }

          @keyframes pricing-glow-breathe {
            0%, 100% { opacity: 0.25; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(1.04); }
          }
          @media (prefers-reduced-motion: reduce) {
            .pricing-glow-anim { animation: none !important; opacity: 0.3 !important; }
          }
        `}</style>

        <div className="pricing-bg-root absolute inset-0">

          {/* ── Gradient dome ── */}
          <div className="absolute inset-0">

            {/* Luminous gradient dome */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: [
                  `radial-gradient(80% 55% at 50% 60%, color-mix(in oklch, var(--tc-primary) 35%, transparent) 0%, color-mix(in oklch, var(--tc-accent) 25%, transparent) 25%, color-mix(in oklch, var(--tc-primary) 10%, rgba(var(--pricing-base-rgb),0.4)) 45%, rgba(var(--pricing-base-rgb),0.85) 65%, var(--pricing-base) 85%)`,
                  `radial-gradient(70% 50% at 12% 30%, color-mix(in oklch, var(--tc-primary) 40%, transparent) 0%, color-mix(in oklch, var(--tc-accent) 20%, transparent) 30%, transparent 60%)`,
                  `radial-gradient(60% 45% at 88% 45%, color-mix(in oklch, var(--tc-accent) 25%, transparent) 0%, transparent 55%)`,
                  `linear-gradient(to bottom, rgba(var(--pricing-base-rgb),0.3), transparent 40%)`,
                ].join(','),
                backgroundColor: 'var(--pricing-base)',
              }}
            />

            {/* Vignette edges */}
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(140% 120% at 50% 30%, transparent 55%, var(--pricing-vignette))`,
              }}
            />
          </div>

          {/* ── Structural grid: bold outer borders at max-w-6xl edges ── */}
          <div className="pointer-events-none absolute inset-0 mx-auto hidden w-full max-w-6xl lg:block">
            <div
              className="absolute inset-y-0 left-0 z-10 h-full w-px"
              style={{
                background: 'var(--pricing-grid-strong)',
                maskImage: 'linear-gradient(to bottom, white 80%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, white 80%, transparent 100%)',
              }}
            />
            <div
              className="absolute inset-y-0 right-0 z-10 h-full w-px"
              style={{
                background: 'var(--pricing-grid-strong)',
                maskImage: 'linear-gradient(to bottom, white 80%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to bottom, white 80%, transparent 100%)',
              }}
            />
          </div>

          {/* ── Structural grid: inner content borders ── */}
          <div className="pointer-events-none absolute inset-0 mx-auto w-full max-w-6xl">
            <div
              className="absolute inset-y-0 left-4 w-px md:left-8"
              style={{ background: `linear-gradient(to bottom, transparent, var(--pricing-grid-medium) 30%, var(--pricing-grid-medium))` }}
            />
            <div
              className="absolute inset-y-0 right-4 w-px md:right-8"
              style={{ background: `linear-gradient(to bottom, transparent, var(--pricing-grid-medium) 30%, var(--pricing-grid-medium))` }}
            />
            <div
              className="absolute inset-y-0 left-8 w-px md:left-12"
              style={{ background: `linear-gradient(to bottom, transparent, var(--pricing-grid-light) 30%, var(--pricing-grid-light))` }}
            />
            <div
              className="absolute inset-y-0 right-8 w-px md:right-12"
              style={{ background: `linear-gradient(to bottom, transparent, var(--pricing-grid-light) 30%, var(--pricing-grid-light))` }}
            />
          </div>

          {/* ── Central glow — breathing animation (dark mode only) ── */}
          <div
            className="pricing-glow-anim pointer-events-none absolute left-1/2 top-[78%] h-52 w-64 -translate-x-1/2 rounded-full sm:h-56 sm:w-80 hidden dark:block"
            style={{
              background: `radial-gradient(ellipse, color-mix(in oklch, var(--tc-primary) 50%, transparent) 0%, color-mix(in oklch, var(--tc-accent) 30%, transparent) 40%, transparent 70%)`,
              filter: 'blur(60px)',
              animation: 'pricing-glow-breathe 8s ease-in-out infinite',
            }}
          />

        </div>
      </div>
    </div>
  );
}
