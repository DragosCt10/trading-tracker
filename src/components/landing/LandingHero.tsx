'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ParticleBackground } from './ParticleBackground';
import { useParallax } from '@/hooks/useParallax';

export function LandingHero() {
  // 2200ms delay: wait for entrance animations (1.7s delay + 0.7s duration)
  const sectionRef = useParallax(2200);

  return (
    <section ref={sectionRef} className="relative overflow-hidden">
      {/* Animated particle background */}
      {/* <ParticleBackground /> */}

      {/* Equity-curve waves */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" data-parallax-speed="-0.25">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1400 800"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
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
            <filter id="waveGlow" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
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
            {/* ── Comet tail gradients — tapered wedge fills ── */}
            <linearGradient id="cometTail1" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0" />
              <stop offset="15%" stopColor="var(--tc-primary)" stopOpacity="0.12" />
              <stop offset="50%" stopColor="var(--tc-primary)" stopOpacity="0.4" />
              <stop offset="85%" stopColor="white" stopOpacity="0.7" />
              <stop offset="100%" stopColor="white" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="cometTail1Core" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0" />
              <stop offset="30%" stopColor="var(--tc-primary)" stopOpacity="0.3" />
              <stop offset="70%" stopColor="white" stopOpacity="0.7" />
              <stop offset="100%" stopColor="white" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="cometTail2" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--tc-accent)" stopOpacity="0" />
              <stop offset="15%" stopColor="var(--tc-accent)" stopOpacity="0.1" />
              <stop offset="50%" stopColor="var(--tc-accent)" stopOpacity="0.35" />
              <stop offset="85%" stopColor="white" stopOpacity="0.65" />
              <stop offset="100%" stopColor="white" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="cometTail2Core" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--tc-accent)" stopOpacity="0" />
              <stop offset="30%" stopColor="var(--tc-accent)" stopOpacity="0.25" />
              <stop offset="70%" stopColor="white" stopOpacity="0.6" />
              <stop offset="100%" stopColor="white" stopOpacity="1" />
            </linearGradient>
            {/* Soft bloom for outer tail */}
            <filter id="tailGlow" x="-10%" y="-150%" width="120%" height="400%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Head glow */}
            <filter id="cometGlow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Radial glow for head */}
            <radialGradient id="headGlow1">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="30%" stopColor="var(--tc-primary)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="var(--tc-primary)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="headGlow2">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="30%" stopColor="var(--tc-accent)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--tc-accent)" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="waveFill" x1="0" y1="0" x2="0.8" y2="0.3">
              <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0" />
              <stop offset="30%" stopColor="var(--tc-primary)" stopOpacity="0.06" />
              <stop offset="70%" stopColor="var(--tc-accent)" stopOpacity="0.1" />
              <stop offset="100%" stopColor="var(--tc-accent)" stopOpacity="0" />
            </linearGradient>
            {/* Trading bar vertical gradient — fades at both top and bottom */}
            <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0" />
              <stop offset="12%" stopColor="var(--tc-primary)" stopOpacity="0.18" />
              <stop offset="45%" stopColor="var(--tc-accent)" stopOpacity="0.22" />
              <stop offset="85%" stopColor="var(--tc-accent)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--tc-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g mask="url(#waveMask)">
            {/* ── Trading bars — positioned along the main equity curve ── */}
            {[
              { x: 480,  h: 215, d: 0.9 },
              { x: 520,  h: 175, d: 0.95 },
              { x: 560,  h: 225, d: 1.0 },
              { x: 600,  h: 190, d: 1.05 },
              { x: 640,  h: 255, d: 1.1 },
              { x: 680,  h: 210, d: 1.15 },
              { x: 720,  h: 285, d: 1.2 },
              { x: 760,  h: 230, d: 1.25 },
              { x: 800,  h: 300, d: 1.3 },
              { x: 840,  h: 248, d: 1.35 },
              { x: 880,  h: 330, d: 1.4 },
              { x: 920,  h: 270, d: 1.42 },
              { x: 960,  h: 365, d: 1.47 },
              { x: 1000, h: 298, d: 1.52 },
              { x: 1040, h: 400, d: 1.57 },
              { x: 1080, h: 330, d: 1.62 },
              { x: 1120, h: 445, d: 1.67 },
              { x: 1160, h: 365, d: 1.72 },
              { x: 1200, h: 490, d: 1.77 },
            ].map(({ x, h, d }, i) => (
              <rect
                key={i}
                x={x}
                y={800 - h}
                width={28}
                height={h}
                rx={2}
                fill="url(#barGrad)"
                className="trading-bar-svg"
                style={{ animationDelay: `${d}s` }}
              />
            ))}

            <path
              d="M-50,700 C100,680 200,650 350,620 C500,590 550,540 650,480 C750,420 800,460 900,400 C1000,340 1050,280 1150,220 C1250,160 1300,100 1450,30 L1450,800 L-50,800 Z"
              fill="url(#waveFill)"
              className="equity-wave-fill"
            />
            <path
              d="M-50,750 C100,730 250,710 400,680 C550,650 600,620 750,560 C900,500 950,520 1050,450 C1150,380 1200,320 1350,240 C1420,200 1440,160 1460,100"
              fill="none" stroke="url(#waveGrad3)" strokeWidth="1"
              className="equity-wave equity-wave-1"
            />
            <path
              d="M-50,720 C80,700 180,670 330,640 C480,610 540,570 660,510 C780,450 830,470 940,410 C1050,350 1100,290 1200,230 C1300,170 1350,120 1460,50"
              fill="none" stroke="url(#waveGrad3)" strokeWidth="1.2"
              className="equity-wave equity-wave-2"
            />
            <path
              d="M-50,700 C100,680 200,650 350,620 C500,590 550,540 650,480 C750,420 800,460 900,400 C1000,340 1050,280 1150,220 C1250,160 1300,100 1450,30"
              fill="none" stroke="url(#waveGrad2)" strokeWidth="1.8"
              filter="url(#waveGlow)"
              className="equity-wave equity-wave-3"
            />
            <path
              d="M-50,680 C120,660 220,630 370,595 C520,560 570,510 680,450 C790,390 830,420 930,360 C1030,300 1080,240 1180,180 C1280,120 1330,70 1460,-10"
              fill="none" stroke="url(#waveGrad1)" strokeWidth="0.8"
              className="equity-wave equity-wave-4"
            />
            <path
              d="M-50,660 C140,640 240,600 390,565 C540,530 590,480 710,420 C830,360 860,385 960,325 C1060,265 1110,205 1210,145 C1310,85 1360,40 1460,-30"
              fill="none" stroke="url(#waveGrad3)" strokeWidth="0.5"
              className="equity-wave equity-wave-5"
            />
            {/* ── Comet 1 — primary, main equity line ── */}
            <g>
              <animateMotion
                dur="6s" repeatCount="indefinite"
                path="M-50,700 C100,680 200,650 350,620 C500,590 550,540 650,480 C750,420 800,460 900,400 C1000,340 1050,280 1150,220 C1250,160 1300,100 1450,30"
                rotate="auto"
              />
              {/* Outer tail */}
              <polygon points="-18,-2.5 -18,2.5 0,0" fill="url(#cometTail1)" filter="url(#tailGlow)" />
              {/* Inner tail */}
              <polygon points="-12,-0.8 -12,0.8 0,0" fill="url(#cometTail1Core)" />
              {/* Head glow */}
              <circle r="8" fill="url(#headGlow1)" filter="url(#cometGlow)" />
              {/* Bright core */}
              <circle r="2" fill="white" fillOpacity="1" />
            </g>

            {/* ── Comet 2 — accent, second equity line ── */}
            <g>
              <animateMotion
                dur="8s" repeatCount="indefinite"
                path="M-50,720 C80,700 180,670 330,640 C480,610 540,570 660,510 C780,450 830,470 940,410 C1050,350 1100,290 1200,230 C1300,170 1350,120 1460,50"
                rotate="auto"
              />
              {/* Outer tail */}
              <polygon points="-14,-2 -14,2 0,0" fill="url(#cometTail2)" filter="url(#tailGlow)" />
              {/* Inner tail */}
              <polygon points="-10,-0.6 -10,0.6 0,0" fill="url(#cometTail2Core)" />
              {/* Head glow */}
              <circle r="6" fill="url(#headGlow2)" filter="url(#cometGlow)" />
              {/* Bright core */}
              <circle r="1.5" fill="white" fillOpacity="0.95" />
            </g>

            {/* ── Comet 3 — smallest, wave-4 path ── */}
            <g>
              <animateMotion
                dur="10s" repeatCount="indefinite"
                path="M-50,680 C120,660 220,630 370,595 C520,560 570,510 680,450 C790,390 830,420 930,360 C1030,300 1080,240 1180,180 C1280,120 1330,70 1460,-10"
                rotate="auto"
              />
              {/* Outer tail */}
              <polygon points="-11,-1.5 -11,1.5 0,0" fill="url(#cometTail1)" filter="url(#tailGlow)" />
              {/* Inner tail */}
              <polygon points="-7,-0.5 -7,0.5 0,0" fill="url(#cometTail1Core)" />
              {/* Head glow */}
              <circle r="5" fill="url(#headGlow1)" filter="url(#cometGlow)" />
              {/* Bright core */}
              <circle r="1.2" fill="white" fillOpacity="0.9" />
            </g>
          </g>
        </svg>
      </div>

      {/* Ambient glow — bottom-right */}
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

      <div className="relative mx-auto max-w-6xl px-4 pb-30 pt-30 lg:pt-40">
        <div className="max-w-xl">

          {/* Badge */}
          <div className="mb-8" data-parallax-speed="0.45">
            <div className="inline-flex items-center gap-2.5 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none px-4 py-1.5 backdrop-blur-sm">
              <span
                className="h-1.5 w-1.5 rounded-full animate-pulse flex-shrink-0"
                style={{ backgroundColor: 'var(--tc-primary)' }}
              />
              <span className="text-sm text-muted-foreground">
                Your trading, fully measured
              </span>
            </div>
          </div>

          {/* Heading */}
          <h1
            className="bg-clip-text text-transparent text-4xl sm:text-5xl lg:text-[54px] xl:text-[62px] font-medium leading-[1.08] tracking-[-0.04em]"
            data-parallax-speed="0.35"
            style={{
              backgroundImage: 'linear-gradient(to bottom, var(--foreground) 54%, var(--tc-accent))',
            }}
          >
            Know your numbers.
            <br />
            Own your results.
          </h1>

          {/* Divider with stats */}
          <div
            className="mt-8 flex items-center gap-6"
            data-parallax-speed="0.28"
          >
            <div className="h-px flex-1 max-w-[40px]" style={{ background: 'color-mix(in oklch, var(--tc-primary) 40%, transparent)' }} />
            {[
              { label: 'Traders',               value: '1,200+' },
              { label: 'Trades tracked',        value: '4.2M+'  },
              { label: 'Stats Board', value: '3,800+' },
            ].map(({ label, value }, i) => (
              <div key={label} className="flex items-baseline gap-1.5">
                {i > 0 && <span className="text-muted-foreground text-xs">·</span>}
                <span className="text-xs text-muted-foreground font-medium">{label}</span>
                <span
                  className="text-lg font-bold"
                  style={{ color: 'var(--tc-primary)' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Subtitle */}
          <p
            className="mt-6 max-w-[480px] text-base sm:text-lg leading-[1.6] text-muted-foreground"
            data-parallax-speed="0.2"
          >
            Go beyond basic stats. Get deep, actionable insights into your performance — and trade with confidence.
          </p>

          {/* CTA */}
          <div
            className="mt-10 flex items-center gap-4"
            data-parallax-speed="0.12"
          >
            <Link
              href="/login"
              className="relative overflow-hidden inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 group border-0"
              style={{
                background: `linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))`,
                boxShadow: '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
              }}
            >
              <span className="relative z-10 flex items-center gap-2">
                Start for free
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
            </Link>

            <a
              href="#features"
              className="text-sm text-muted-foreground hover:text-white transition-colors duration-200"
            >
              See features
            </a>
          </div>
        </div>
      </div>

      {/* Bottom fade */}
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
