'use client';

import { Brain, Sparkles, Target, BarChart3, Zap } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { AiVisionPatternPreview } from './ai-vision-previews/AiVisionPatternPreview';
import { AiVisionScorePreview } from './ai-vision-previews/AiVisionScorePreview';
import { AiVisionMetricPreview } from './ai-vision-previews/AiVisionMetricPreview';

/* ── Feature pills ── */
const FEATURE_PILLS = [
  {
    icon: Brain,
    title: 'Pattern Detection',
    description: 'Uncovers strengths, weaknesses, and hidden patterns in your trading data automatically.',
  },
  {
    icon: Target,
    title: 'Health Scoring',
    description: 'A single 0–100 score that blends 11 key metrics into one clear picture of performance.',
  },
  {
    icon: BarChart3,
    title: 'Period Comparison',
    description: 'Compare 7d, 30d, and 90d windows to track progress and spot regressions.',
  },
  {
    icon: Zap,
    title: 'Actionable Insights',
    description: 'Every detection includes what it means and what to do about it — not just data.',
  },
];

/* ── SVG connector paths (desktop hub-and-spoke) ── */
function HubConnectors() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none hidden lg:block"
      viewBox="0 0 1000 620"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="ai-spoke-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--tc-primary, #a855f7)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--tc-accent, #8b5cf6)" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="ai-spoke-grad-r" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--tc-primary, #a855f7)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--tc-accent, #8b5cf6)" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id="ai-spoke-grad-down" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--tc-primary, #a855f7)" stopOpacity="0.6" />
          <stop offset="100%" stopColor="var(--tc-accent, #8b5cf6)" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Center → Left card (Patterns) */}
      <path
        className="ai-spoke-path"
        d="M 500 280 C 400 280, 320 250, 220 200"
        stroke="url(#ai-spoke-grad-r)"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        style={{ '--spoke-delay': '0.4s' } as React.CSSProperties}
      />
      {/* Data flow dot */}
      <circle r="3" fill="var(--tc-primary, #a855f7)" opacity="0.8">
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          begin="1.5s"
          path="M 500 280 C 400 280, 320 250, 220 200"
        />
      </circle>

      {/* Center → Right card (Score) */}
      <path
        className="ai-spoke-path"
        d="M 500 280 C 600 280, 680 250, 780 200"
        stroke="url(#ai-spoke-grad)"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        style={{ '--spoke-delay': '0.6s' } as React.CSSProperties}
      />
      <circle r="3" fill="var(--tc-primary, #a855f7)" opacity="0.8">
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          begin="2s"
          path="M 500 280 C 600 280, 680 250, 780 200"
        />
      </circle>

      {/* Center → Bottom card (Metrics) */}
      <path
        className="ai-spoke-path"
        d="M 500 310 C 500 380, 500 420, 500 480"
        stroke="url(#ai-spoke-grad-down)"
        strokeWidth="1.5"
        strokeDasharray="6 4"
        style={{ '--spoke-delay': '0.8s' } as React.CSSProperties}
      />
      <circle r="3" fill="var(--tc-primary, #a855f7)" opacity="0.8">
        <animateMotion
          dur="3s"
          repeatCount="indefinite"
          begin="2.5s"
          path="M 500 310 C 500 380, 500 420, 500 480"
        />
      </circle>
    </svg>
  );
}

/* ── Mobile flow connector ── */
function FlowArrow() {
  return (
    <div className="flex flex-col items-center gap-1 py-2 lg:hidden">
      <div className="w-px h-6 border-l border-dashed border-slate-600/40" />
      <div
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: 'var(--tc-primary, #a855f7)', opacity: 0.5 }}
      />
    </div>
  );
}

/* ── Spotlight beam — single centered light from top ── */
function SpotlightBeam() {
  const beamBase = 'absolute left-0 right-0 mx-auto rounded-b-[50%] pointer-events-none';
  const conicGradient =
    'conic-gradient(from 0deg at 50% -5%, transparent 45%, color-mix(in oklch, var(--tc-primary, #a855f7) 30%, transparent) 49%, color-mix(in oklch, var(--tc-primary, #a855f7) 50%, transparent) 50%, color-mix(in oklch, var(--tc-primary, #a855f7) 30%, transparent) 51%, transparent 55%)';

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Center beam */}
      <div
        className={beamBase}
        style={{
          top: 0, width: '30em', height: '100%',
          backgroundImage: conicGradient,
          transformOrigin: '50% 0',
          filter: 'blur(15px) opacity(0.5)',
        }}
      />
      {/* Left angled beam */}
      <div
        className={beamBase}
        style={{
          top: 0, width: '30em', height: '100%',
          backgroundImage: conicGradient,
          transformOrigin: '50% 0',
          transform: 'rotate(20deg)',
          filter: 'blur(16px) opacity(0.35)',
        }}
      />
      {/* Right angled beam */}
      <div
        className={beamBase}
        style={{
          top: 0, width: '30em', height: '100%',
          backgroundImage: conicGradient,
          transformOrigin: '50% 0',
          transform: 'rotate(-20deg)',
          filter: 'blur(16px) opacity(0.35)',
        }}
      />
    </div>
  );
}

/* ── Main component ── */
export function LandingAiVision() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section ref={sectionRef} id="ai-vision" className="relative scroll-mt-20">
      {/* ── Background ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {/* Spotlight beams — theme colored */}
        <SpotlightBeam />

        {/* Top gradient blend */}
        <div className="absolute top-0 left-0 right-0 h-40 z-[1] bg-gradient-to-b from-white to-transparent dark:from-[#0d0a12] dark:to-transparent" />

        {/* Bottom gradient blend */}
        <div className="absolute bottom-0 left-0 right-0 h-40 z-[1] bg-gradient-to-t from-white to-transparent dark:from-[#0d0a12] dark:to-transparent" />
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
          <span className="text-sm text-muted-foreground">AI Vision</span>
        </div>

        {/* Heading */}
        <h2
          className="scroll-reveal text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.12] tracking-[-0.03em] bg-clip-text text-transparent max-w-2xl"
          style={{
            backgroundImage: 'linear-gradient(to bottom, var(--foreground) 40%, var(--tc-accent))',
            '--reveal-delay': '100ms',
          } as React.CSSProperties}
        >
          Your Data Flows In.
          <br />
          Insights Come Out.
        </h2>

        {/* Description */}
        <p
          className="scroll-reveal mt-5 text-base text-muted-foreground leading-relaxed max-w-lg"
          style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
        >
          Feed your trades to the AI and it detects patterns, scores your performance health,
          and tracks every metric across time — so you always know where you stand.
        </p>

        {/* ── Hub-and-spoke visualization ── */}
        <div
          className="scroll-reveal relative mt-14"
          style={{ '--reveal-delay': '300ms' } as React.CSSProperties}
        >
          {/* Desktop: hub-and-spoke grid */}
          <div className="relative">
            {/* SVG connector lines (desktop only) */}
            <HubConnectors />

            {/* Cards grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-8 items-start">
              {/* Left card: Patterns */}
              <div
                className="scroll-reveal lg:mt-0"
                style={{ '--reveal-delay': '400ms' } as React.CSSProperties}
              >
                <AiVisionPatternPreview />
              </div>

              {/* Center: AI hub node */}
              <div className="flex flex-col items-center justify-start lg:pt-8 order-first lg:order-none">
                {/* Flow label above hub */}
                <div
                  className="scroll-reveal flex items-center gap-2 mb-4 text-xs text-muted-foreground"
                  style={{ '--reveal-delay': '350ms' } as React.CSSProperties}
                >
                  <Sparkles className="h-3.5 w-3.5" style={{ color: 'var(--tc-primary)' }} />
                  <span>Your trades data</span>
                </div>

                {/* Animated dashed line into hub (mobile + desktop) */}
                <div className="w-px h-8 border-l border-dashed border-slate-600/40 mb-3" />

                {/* Hub node */}
                <div className="ai-hub-glow relative flex items-center justify-center w-16 h-16 rounded-full border border-slate-700/50 bg-slate-900/60 backdrop-blur-sm">
                  <div
                    className="absolute inset-0 rounded-full opacity-20"
                    style={{
                      background: `radial-gradient(circle, var(--tc-primary, #a855f7) 0%, transparent 70%)`,
                    }}
                  />
                  <Brain className="h-7 w-7 text-white relative z-10" />
                </div>

                {/* Label below hub */}
                <span className="mt-3 text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  AI Engine
                </span>

                {/* Dashed line out of hub (mobile) */}
                <FlowArrow />
              </div>

              {/* Right card: Health Score */}
              <div
                className="scroll-reveal lg:mt-0"
                style={{ '--reveal-delay': '550ms' } as React.CSSProperties}
              >
                <AiVisionScorePreview />
              </div>
            </div>

            {/* Bottom card: Metrics — full width below */}
            <div className="lg:hidden">
              <FlowArrow />
            </div>
            <div
              className="scroll-reveal mt-2 lg:mt-8 lg:max-w-xl lg:mx-auto"
              style={{ '--reveal-delay': '700ms' } as React.CSSProperties}
            >
              <AiVisionMetricPreview />
            </div>
          </div>
        </div>

        {/* ── Feature pills ── */}
        <div className="relative mt-16 grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-8 lg:grid-cols-4">
          {FEATURE_PILLS.map((pill, i) => {
            const Icon = pill.icon;
            return (
              <div
                key={pill.title}
                className="scroll-reveal space-y-3"
                style={{ '--reveal-delay': `${800 + i * 100}ms` } as React.CSSProperties}
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4" style={{ color: 'var(--tc-primary)' }} />
                  <h3 className="text-sm font-medium text-foreground">{pill.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{pill.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
