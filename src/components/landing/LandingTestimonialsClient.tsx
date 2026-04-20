'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { SectionBadge, SectionHeading } from '@/components/landing/shared';
import { getApprovedReviews } from '@/lib/server/reviews';
import { queryKeys } from '@/lib/queryKeys';
import TestimonialsSection, {
  FALLBACK_TESTIMONIALS,
  TOTAL_DISPLAYED_TESTIMONIALS,
} from '@/components/ui/testimonial-v2';
import type { Testimonial } from '@/components/ui/testimonial-v2';

/**
 * Average rating shown next to the "Share your experience" CTA.
 *
 * The count/average must reflect what's actually on screen — the grid shows
 * approved reviews first and pads remaining slots with fallback testimonials,
 * up to `TOTAL_DISPLAYED_TESTIMONIALS`. So we blend approved + the fallbacks
 * that fill the empty slots and average across that combined set.
 */
function calcAvgRating(approved: Testimonial[]): { avg: string; count: number } | null {
  const remainingSlots = Math.max(0, TOTAL_DISPLAYED_TESTIMONIALS - approved.length);
  const displayed = [...approved, ...FALLBACK_TESTIMONIALS.slice(0, remainingSlots)];
  const rated = displayed.filter((t) => t.rating != null);
  if (rated.length === 0) return null;
  const sum = rated.reduce((acc, t) => acc + (t.rating ?? 0), 0);
  return { avg: (sum / rated.length).toFixed(1), count: rated.length };
}

export function LandingTestimonialsClient() {
  const sectionRef = useScrollReveal<HTMLElement>();

  const { data: testimonials = [] } = useQuery({
    queryKey: queryKeys.reviews.approved(),
    queryFn: () => getApprovedReviews(),
    staleTime: 60_000,
    refetchOnMount: 'always',
  });

  const avgRating = calcAvgRating(testimonials);

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
        <SectionBadge label="Testimonials" revealDelay="0ms" />

        {/* Heading */}
        <SectionHeading className="max-w-2xl" revealDelay="100ms">
          Trusted by Traders
          <br />
          Around the World.
        </SectionHeading>

        {/* Description */}
        <p
          className="scroll-reveal mt-5 text-base text-muted-foreground leading-relaxed max-w-lg"
          style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
        >
          See how traders are using journaling, AI insights, and analytics to
          sharpen their edge and grow their accounts.
        </p>

        {/* CTA */}
        <div
          className="scroll-reveal flex items-center gap-5 flex-wrap mt-8"
          style={{ '--reveal-delay': '250ms' } as React.CSSProperties}
        >
          <Link
            href="/settings?tab=profile"
            className="group relative overflow-hidden inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white border-0 transition-all duration-300 themed-btn-primary"
          >
            <span className="relative z-10 flex items-center gap-2">
              Share your experience
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform duration-300" />
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
          </Link>

          {avgRating && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={`text-sm leading-none ${i < Math.round(parseFloat(avgRating.avg)) ? 'text-amber-400' : 'text-slate-500/40'}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm font-semibold text-foreground">{avgRating.avg}/5</span>
              <span className="text-sm text-muted-foreground">· {avgRating.count} {avgRating.count === 1 ? 'rating' : 'ratings'}</span>
            </div>
          )}
        </div>

        {/* Scrolling testimonials */}
        <div
          className="scroll-reveal"
          style={{ '--reveal-delay': '300ms' } as React.CSSProperties}
        >
          <TestimonialsSection testimonials={testimonials} />
        </div>
      </div>
    </section>
  );
}
