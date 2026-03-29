'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Futuristic perspective grid with radial fade */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1200 800"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Radial fade mask */}
            <radialGradient id="gridFade" cx="50%" cy="55%" rx="55%" ry="50%">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="60%" stopColor="white" stopOpacity="0.4" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>
            <mask id="gridMask">
              <rect width="1200" height="800" fill="url(#gridFade)" />
            </mask>
            {/* Glow filter for intersection dots */}
            <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g mask="url(#gridMask)">
            {/* Perspective vertical lines — converging to vanishing point (600, 200) */}
            {/* Static base layer */}
            {[-500, -400, -300, -200, -100, 0, 100, 200, 300, 400, 500].map((offset) => (
              <line
                key={`v${offset}`}
                x1={600 + offset * 0.15}
                y1={200}
                x2={600 + offset * 1.8}
                y2={800}
                stroke="var(--tc-primary)"
                strokeOpacity="0.08"
                strokeWidth="0.6"
              />
            ))}
            {/* Animated trace layer — energy flowing down the vertical lines */}
            {[-500, -400, -300, -200, -100, 0, 100, 200, 300, 400, 500].map((offset, i) => (
              <line
                key={`vt${offset}`}
                x1={600 + offset * 0.15}
                y1={200}
                x2={600 + offset * 1.8}
                y2={800}
                stroke="var(--tc-primary)"
                strokeOpacity="0.25"
                strokeWidth="0.8"
                className="grid-vline-trace"
                style={{ animationDelay: `${Math.abs(i - 5) * 0.4}s` }}
              />
            ))}

            {/* Horizontal lines — static base */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
              const y = 200 + (i * i * 8.5);
              const spread = i * 0.18;
              return (
                <line
                  key={`h${i}`}
                  x1={600 - 500 * spread}
                  y1={y}
                  x2={600 + 500 * spread}
                  y2={y}
                  stroke="var(--tc-primary)"
                  strokeOpacity={0.05 + i * 0.01}
                  strokeWidth="0.6"
                />
              );
            })}
            {/* Horizontal lines — animated flowing dashes */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
              const y = 200 + (i * i * 8.5);
              const spread = i * 0.18;
              return (
                <line
                  key={`hf${i}`}
                  x1={600 - 500 * spread}
                  y1={y}
                  x2={600 + 500 * spread}
                  y2={y}
                  stroke="var(--tc-primary)"
                  strokeOpacity={0.08 + i * 0.02}
                  strokeWidth="0.8"
                  className="grid-hline-flow"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              );
            })}
            {/* Horizontal pulse wave — a brighter line that sweeps outward from center */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
              const y = 200 + (i * i * 8.5);
              const spread = i * 0.18;
              return (
                <line
                  key={`hp${i}`}
                  x1={600 - 500 * spread}
                  y1={y}
                  x2={600 + 500 * spread}
                  y2={y}
                  stroke="var(--tc-primary)"
                  strokeWidth="1"
                  className="grid-pulse-wave"
                  style={{ animationDelay: `${i * 0.5}s` }}
                />
              );
            })}

            {/* Glowing dots at key intersections — sequential ignition */}
            {[
              [600, 200], [500, 320], [700, 320],
              [400, 420], [600, 420], [800, 420],
              [300, 540], [500, 540], [700, 540], [900, 540],
              [180, 680], [400, 680], [600, 680], [800, 680], [1020, 680],
            ].map(([cx, cy], i) => (
              <circle
                key={`dot${i}`}
                cx={cx}
                cy={cy}
                r="1.5"
                fill="var(--tc-primary)"
                fillOpacity="0.3"
                filter="url(#dotGlow)"
                className="grid-dot-ignite"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </g>
        </svg>

        {/* Horizontal scan line across the grid */}
        <div
          className="absolute left-0 right-0 h-px header-scan-line"
          style={{
            top: '45%',
            background: `linear-gradient(90deg, transparent 10%, color-mix(in oklch, var(--tc-primary) 30%, transparent) 50%, transparent 90%)`,
          }}
        />
      </div>

      {/* Purple gradient glow — bottom-right corner */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 h-[850px] w-[850px] rounded-full"
        style={{
          background: `radial-gradient(circle at center, var(--tc-primary) 0%, color-mix(in oklch, var(--tc-accent) 80%, transparent) 30%, transparent 65%)`,
          opacity: 0.55,
          filter: 'blur(80px)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -right-20 h-[500px] w-[500px] rounded-full"
        style={{
          background: `radial-gradient(circle at center, var(--tc-primary) 0%, color-mix(in oklch, var(--tc-accent) 50%, transparent) 40%, transparent 65%)`,
          opacity: 0.4,
          filter: 'blur(50px)',
        }}
      />

      {/* Bottom-right corner border — only this corner, fading edges */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 right-0">
        {/* Right edge fading upward */}
        <div
          className="absolute bottom-0 right-0 w-px"
          style={{
            height: '280px',
            background: 'linear-gradient(to top, rgba(255,255,255,0.15), transparent)',
          }}
        />
        {/* Bottom edge fading leftward */}
        <div
          className="absolute bottom-0 right-0 h-px"
          style={{
            width: '280px',
            background: 'linear-gradient(to left, rgba(255,255,255,0.15), transparent)',
          }}
        />
        {/* Rounded corner piece */}
        <div
          className="absolute bottom-0 right-0"
          style={{
            width: '32px',
            height: '32px',
            borderBottomRightRadius: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
            borderRight: '1px solid rgba(255,255,255,0.15)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-12 sm:pt-16 lg:pt-20">
        {/* Content — left-aligned, right side empty for gradient */}
        <div className="max-w-xl">
          {/* Badge pill */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-slate-300/30 dark:border-white/[0.15] bg-white/80 dark:bg-black px-3.5 py-1.5">
            <span
              className="flex h-[18px] items-center justify-center rounded-full px-2.5 text-[10px] font-bold text-black"
              style={{ backgroundColor: 'var(--tc-primary)' }}
            >
              NEW
            </span>
            <span
              className="text-sm font-normal"
              style={{ color: 'var(--tc-primary)' }}
            >
              AI-powered trading analytics
            </span>
          </div>

          {/* Heading */}
          <h1
            className="bg-clip-text text-transparent text-5xl sm:text-6xl lg:text-[72px] xl:text-[82px] font-medium leading-[1.02] tracking-[-0.05em]"
            style={{
              backgroundImage:
                'linear-gradient(to bottom, var(--foreground) 54%, var(--tc-accent))',
            }}
          >
            Elevate your
            <br />
            trading edge.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-[544px] text-base sm:text-lg lg:text-xl leading-[1.55] text-slate-500 dark:text-white/60 tracking-[-0.002em]">
            Track expectancy, Sharpe ratio, and drawdown — with smart analytics that help you refine your strategy.
          </p>

          {/* CTA */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="rounded-xl border border-slate-300/40 dark:border-white/[0.15] p-1.5">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-2 text-[15px] font-medium text-black transition-opacity hover:opacity-90"
              >
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Logo bar */}
        <div className="mt-16 flex flex-col items-center gap-6 sm:flex-row sm:gap-8 lg:mt-20">
          <span className="whitespace-nowrap text-sm text-slate-400 dark:text-white/30">
            Trusted by active traders:
          </span>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-10 text-slate-300 dark:text-white/20">
            {['Forex', 'Indices', 'Crypto', 'Commodities', 'Futures'].map(
              (market) => (
                <span
                  key={market}
                  className="text-sm font-semibold tracking-wider uppercase"
                >
                  {market}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
