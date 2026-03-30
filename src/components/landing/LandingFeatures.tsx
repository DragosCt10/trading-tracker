'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';

export function LandingFeatures() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative scroll-mt-20"
    >
      {/* Top gradient blend — seamless transition from hero */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-32"
        style={{
          background:
            'linear-gradient(to bottom, #0d0a12 0%, transparent 100%)',
        }}
      />

      {/* Subtle ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[10%] left-[20%] h-[500px] w-[600px]"
        style={{
          background:
            'radial-gradient(ellipse, color-mix(in oklch, var(--tc-primary) 8%, transparent) 0%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
        {/* Section header */}
        <div className="scroll-reveal scroll-reveal-once text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm mb-6">
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--tc-accent)' }}
            />
            <span className="text-sm text-white/50">Features</span>
          </div>

          <h2
            className="text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.12] tracking-[-0.03em] bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(to bottom, var(--foreground) 40%, var(--tc-accent))',
            }}
          >
            Everything you need to
            <br />
            trade with an edge.
          </h2>

          <p className="mt-5 text-base text-white/40 leading-relaxed max-w-md mx-auto">
            Deep analytics, risk management, and journaling tools designed for
            serious traders.
          </p>
        </div>

        {/* Placeholder grid — will be populated later */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="scroll-reveal group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 min-h-[200px] backdrop-blur-sm transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04]"
              style={{ '--reveal-delay': `${200 + i * 200}ms` } as React.CSSProperties}
            >
              {/* Corner accent */}
              <div
                className="absolute top-0 left-0 w-12 h-12 rounded-tl-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in oklch, var(--tc-primary) 15%, transparent), transparent)',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
