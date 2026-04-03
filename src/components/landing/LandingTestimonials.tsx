'use client';

import { useScrollReveal } from '@/hooks/useScrollReveal';
import TestimonialsSection from '@/components/ui/testimonial-v2';

export function LandingTestimonials() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section ref={sectionRef} id="testimonials" className="relative scroll-mt-20">
      {/* ── Background: theme-aware radial glow ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div
          className="absolute inset-0 -z-30"
          style={{
            backgroundImage: [
              'radial-gradient(60% 45% at 50% 50%, color-mix(in oklch, var(--tc-primary) 12%, transparent) 0%, color-mix(in oklch, var(--tc-accent) 8%, transparent) 35%, transparent 70%)',
              'radial-gradient(45% 35% at 25% 30%, color-mix(in oklch, var(--tc-primary) 8%, transparent) 0%, transparent 60%)',
              'radial-gradient(40% 30% at 75% 70%, color-mix(in oklch, var(--tc-accent) 6%, transparent) 0%, transparent 60%)',
            ].join(','),
          }}
        />

        {/* Soft vignette */}
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(140%_120%_at_50%_0%,transparent_65%,#ffffff_100%)] dark:bg-[radial-gradient(140%_120%_at_50%_0%,transparent_65%,#0d0a12_100%)]" />

        {/* Top gradient blend */}
        <div className="absolute top-0 left-0 right-0 h-56 z-[1] bg-gradient-to-b from-white to-transparent dark:from-[#0d0a12] dark:to-transparent" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-[2] mx-auto max-w-6xl px-4 py-24 sm:py-32">
        {/* Badge */}
        <div
          className="scroll-reveal inline-flex items-center gap-2 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none px-4 py-1.5 backdrop-blur-sm mb-6"
          style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
        >
          <span
            className="h-1.5 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: 'var(--tc-accent)' }}
          />
          <span className="text-sm text-muted-foreground">Testimonials</span>
        </div>

        {/* Heading */}
        <h2
          className="scroll-reveal text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.12] tracking-[-0.03em] bg-clip-text text-transparent max-w-2xl"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, var(--foreground) 40%, var(--tc-accent))',
            '--reveal-delay': '100ms',
          } as React.CSSProperties}
        >
          Trusted by Traders
          <br />
          Around the World.
        </h2>

        {/* Description */}
        <p
          className="scroll-reveal mt-5 text-base text-muted-foreground leading-relaxed max-w-lg"
          style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
        >
          See how traders are using journaling, AI insights, and analytics to
          sharpen their edge and grow their accounts.
        </p>

        {/* Scrolling testimonials */}
        <div
          className="scroll-reveal"
          style={{ '--reveal-delay': '300ms' } as React.CSSProperties}
        >
          <TestimonialsSection />
        </div>
      </div>
    </section>
  );
}
