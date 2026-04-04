'use client';

import { useCallback, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export function LandingMidCTA() {
  const sectionRef = useScrollReveal<HTMLElement>();
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const posRef = useRef({ x: -200, y: -200 });

  const updateSpotlight = useCallback((x: number, y: number) => {
    posRef.current = { x, y };
    if (spotlightRef.current) {
      spotlightRef.current.style.background = `radial-gradient(700px circle at ${x}px ${y}px, color-mix(in oklch, var(--tc-primary) 14%, transparent), transparent 40%)`;
      spotlightRef.current.style.opacity = x === -200 ? '0' : '1';
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      updateSpotlight(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (containerRef.current && e.touches.length > 0) {
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();
      updateSpotlight(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  };

  return (
    <section ref={sectionRef} className="relative">
      {/* Seamless top fade — tall enough to dissolve into previous section */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-48 z-[1] bg-gradient-to-b from-[var(--grad-from)] via-[var(--grad-from)]/60 to-transparent"
      />
      {/* Seamless bottom fade — dissolves into next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 z-[1] bg-gradient-to-t from-[var(--grad-from)] via-[var(--grad-from)]/60 to-transparent"
      />

      <div className="relative z-[2] mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div
          className="scroll-reveal"
          style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
        >
          <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => updateSpotlight(-200, -200)}
            onTouchMove={handleTouchMove}
            onTouchStart={handleTouchMove}
            onTouchEnd={() => updateSpotlight(-200, -200)}
            className="group/spotlight relative w-full p-8 sm:p-10 overflow-hidden rounded-2xl bg-transparent"
          >
            {/* Spotlight radial — follows cursor */}
            <div
              ref={spotlightRef}
              className="absolute inset-0 pointer-events-none transition-opacity duration-300"
              style={{ opacity: 0 }}
            />

            {/* Top bleeding edge shade */}
            <div
              aria-hidden
              className="absolute inset-x-0 -top-px h-px pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--tc-primary), var(--tc-accent), transparent)',
              }}
            />
            {/* Bottom bleeding edge shade */}
            <div
              aria-hidden
              className="absolute inset-x-0 -bottom-px h-px pointer-events-none"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--tc-accent), var(--tc-primary), transparent)',
              }}
            />

            {/* Left bleeding edge shade */}
            <div
              aria-hidden
              className="absolute inset-y-0 -left-px w-px pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, transparent, color-mix(in oklch, var(--tc-primary) 60%, transparent), transparent)',
              }}
            />
            {/* Right bleeding edge shade */}
            <div
              aria-hidden
              className="absolute inset-y-0 -right-px w-px pointer-events-none"
              style={{
                background:
                  'linear-gradient(180deg, transparent, color-mix(in oklch, var(--tc-accent) 60%, transparent), transparent)',
              }}
            />

            {/* Corner glow bleeds */}
            <div
              aria-hidden
              className="absolute -top-8 -left-8 w-32 h-32 rounded-full pointer-events-none blur-2xl"
              style={{
                background:
                  'color-mix(in oklch, var(--tc-primary) 10%, transparent)',
              }}
            />
            <div
              aria-hidden
              className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full pointer-events-none blur-2xl"
              style={{
                background:
                  'color-mix(in oklch, var(--tc-accent) 10%, transparent)',
              }}
            />

            {/* Subtle inner border */}
            <div
              aria-hidden
              className="absolute inset-0 rounded-2xl pointer-events-none border border-white/[0.06]"
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Text side */}
              <div className="text-center md:text-left">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/30 shadow-md px-4 py-1.5 backdrop-blur-sm mb-5">
                  <Sparkles
                    className="h-3.5 w-3.5"
                    style={{ color: 'var(--tc-primary)' }}
                  />
                  <span className="text-sm text-muted-foreground">
                    Free forever
                  </span>
                </div>

                <h2
                  className="text-3xl md:text-4xl font-semibold tracking-[-0.02em] bg-clip-text text-transparent leading-[1.15]"
                  style={{
                    backgroundImage:
                      'linear-gradient(to bottom right, var(--foreground) 30%, var(--tc-accent))',
                  }}
                >
                  Start tracking like a pro, for free.
                </h2>
                <p className="mt-4 text-base text-muted-foreground max-w-md leading-relaxed">
                  Every stat above — custom filters, AI analysis, equity curves
                  — is included free. No credit card, no limits.
                </p>
              </div>

              {/* Button side */}
              <Link
                href="/login"
                className="group/button flex-shrink-0 inline-flex items-center justify-center gap-2 px-8 py-4 font-semibold text-white rounded-full transition-all duration-300 ease-in-out hover:brightness-110"
                style={{
                  background:
                    'linear-gradient(135deg, var(--tc-primary), var(--tc-accent))',
                  boxShadow:
                    '0 10px 25px -5px color-mix(in oklch, var(--tc-primary) 40%, transparent)',
                }}
              >
                Get started free
                <ArrowRight className="h-5 w-5 transform transition-transform duration-300 ease-in-out group-hover/button:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
