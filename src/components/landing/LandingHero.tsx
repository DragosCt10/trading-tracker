'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ParticleBackground } from './ParticleBackground';

export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Animated particle background */}
      <ParticleBackground />

      {/* Equity-curve waves — flowing from left to top-right corner */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1400 800"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Fade mask — waves visible left-to-right, fading at edges */}
            <linearGradient id="waveFadeH" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="white" stopOpacity="0.3" />
              <stop offset="15%" stopColor="white" stopOpacity="0.9" />
              <stop offset="70%" stopColor="white" stopOpacity="0.7" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="waveFadeV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="20%" stopColor="white" stopOpacity="0.8" />
              <stop offset="80%" stopColor="white" stopOpacity="0.9" />
              <stop offset="100%" stopColor="white" stopOpacity="0.4" />
            </linearGradient>
            <mask id="waveMask">
              <rect width="1400" height="800" fill="url(#waveFadeH)" />
              <rect width="1400" height="800" fill="url(#waveFadeV)" style={{ mixBlendMode: 'multiply' }} />
            </mask>
            {/* Glow filter for the bright wave */}
            <filter id="waveGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Gradient along each wave path */}
            <linearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0" />
              <stop offset="20%" stopColor="var(--tc-primary)" stopOpacity="0.15" />
              <stop offset="60%" stopColor="var(--tc-accent)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--tc-accent)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="waveGrad2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0" />
              <stop offset="25%" stopColor="var(--tc-primary)" stopOpacity="0.3" />
              <stop offset="65%" stopColor="var(--tc-accent)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--tc-accent)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="waveGrad3" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0" />
              <stop offset="15%" stopColor="var(--tc-primary)" stopOpacity="0.08" />
              <stop offset="55%" stopColor="var(--tc-accent)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--tc-accent)" stopOpacity="0" />
            </linearGradient>
            {/* Fill gradient for the area under the main wave */}
            <linearGradient id="waveFill" x1="0" y1="0" x2="0.8" y2="0.3">
              <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0" />
              <stop offset="30%" stopColor="var(--tc-primary)" stopOpacity="0.06" />
              <stop offset="70%" stopColor="var(--tc-accent)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--tc-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g mask="url(#waveMask)">
            {/* Area fill under the primary equity curve */}
            <path
              d="M-50,700 C100,680 200,650 350,620 C500,590 550,540 650,480 C750,420 800,460 900,400 C1000,340 1050,280 1150,220 C1250,160 1300,100 1450,30 L1450,800 L-50,800 Z"
              fill="url(#waveFill)"
              className="equity-wave-fill"
            />

            {/* Wave 1 — outermost, subtle, lowest */}
            <path
              d="M-50,750 C100,730 250,710 400,680 C550,650 600,620 750,560 C900,500 950,520 1050,450 C1150,380 1200,320 1350,240 C1420,200 1440,160 1460,100"
              fill="none"
              stroke="url(#waveGrad3)"
              strokeWidth="1"
              className="equity-wave equity-wave-1"
            />

            {/* Wave 2 — secondary equity curve, mid-layer */}
            <path
              d="M-50,720 C80,700 180,670 330,640 C480,610 540,570 660,510 C780,450 830,470 940,410 C1050,350 1100,290 1200,230 C1300,170 1350,120 1460,50"
              fill="none"
              stroke="url(#waveGrad3)"
              strokeWidth="1.2"
              className="equity-wave equity-wave-2"
            />

            {/* Wave 3 — primary equity curve (brightest) */}
            <path
              d="M-50,700 C100,680 200,650 350,620 C500,590 550,540 650,480 C750,420 800,460 900,400 C1000,340 1050,280 1150,220 C1250,160 1300,100 1450,30"
              fill="none"
              stroke="url(#waveGrad2)"
              strokeWidth="1.8"
              filter="url(#waveGlow)"
              className="equity-wave equity-wave-3"
            />

            {/* Wave 4 — thinner accent line above primary */}
            <path
              d="M-50,680 C120,660 220,630 370,595 C520,560 570,510 680,450 C790,390 830,420 930,360 C1030,300 1080,240 1180,180 C1280,120 1330,70 1460,-10"
              fill="none"
              stroke="url(#waveGrad1)"
              strokeWidth="0.8"
              className="equity-wave equity-wave-4"
            />

            {/* Wave 5 — topmost whisper line */}
            <path
              d="M-50,660 C140,640 240,600 390,565 C540,530 590,480 710,420 C830,360 860,385 960,325 C1060,265 1110,205 1210,145 C1310,85 1360,40 1460,-30"
              fill="none"
              stroke="url(#waveGrad3)"
              strokeWidth="0.5"
              className="equity-wave equity-wave-5"
            />

            {/* Animated trace — bright point traveling along the primary curve */}
            <circle r="3" fill="var(--tc-primary)" fillOpacity="0.8" filter="url(#waveGlow)">
              <animateMotion
                dur="6s"
                repeatCount="indefinite"
                path="M-50,700 C100,680 200,650 350,620 C500,590 550,540 650,480 C750,420 800,460 900,400 C1000,340 1050,280 1150,220 C1250,160 1300,100 1450,30"
              />
            </circle>

            {/* Secondary trace — dimmer, on wave 2 */}
            <circle r="2" fill="var(--tc-accent)" fillOpacity="0.5" filter="url(#waveGlow)">
              <animateMotion
                dur="8s"
                repeatCount="indefinite"
                path="M-50,720 C80,700 180,670 330,640 C480,610 540,570 660,510 C780,450 830,470 940,410 C1050,350 1100,290 1200,230 C1300,170 1350,120 1460,50"
              />
            </circle>
          </g>
        </svg>
      </div>

      {/* Ambient glow along the wave path — bottom-right area */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 right-[10%] h-[600px] w-[800px]"
        style={{
          background: `radial-gradient(ellipse at 70% 80%, var(--tc-primary) 0%, color-mix(in oklch, var(--tc-accent) 60%, transparent) 25%, transparent 60%)`,
          opacity: 0.3,
          filter: 'blur(90px)',
          transform: 'rotate(-15deg)',
        }}
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-30 pt-12 sm:pt-16 lg:pt-20">
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
      </div>

      {/* Bottom fade to next section */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-20"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(13,10,18,0.4) 40%, rgba(13,10,18,0.8) 70%, #0d0a12 100%)',
        }}
      />
    </section>
  );
}
