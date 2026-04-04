'use client';

import { Bot, Sparkles, Target, BarChart3, Zap } from 'lucide-react';
import { SectionBadge, SectionHeading } from '@/components/landing/shared';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { AiVisionPatternPreview } from './ai-vision-previews/AiVisionPatternPreview';
import { AiVisionScorePreview } from './ai-vision-previews/AiVisionScorePreview';
import { AiVisionMetricPreview } from './ai-vision-previews/AiVisionMetricPreview';

/* ── Feature pills ── */
const FEATURE_PILLS = [
  {
    icon: Bot,
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

/* ── Gradient dome background (matches pricing page) ── */
function AiVisionBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <style>{`
        .ai-vision-bg-root {
          --av-base: #ffffff;
          --av-base-rgb: 255,255,255;
          --av-vignette: rgba(255,255,255,0.85);
        }
        :is(.dark) .ai-vision-bg-root {
          --av-base: #0d0a12;
          --av-base-rgb: 13,10,18;
          --av-vignette: rgba(13,10,18,0.9);
        }
        @keyframes av-glow-breathe {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.04); }
        }
        @media (prefers-reduced-motion: reduce) {
          .av-glow-anim { animation: none !important; opacity: 0.3 !important; }
        }
      `}</style>

      <div className="ai-vision-bg-root absolute inset-0">
        {/* Luminous gradient dome */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: [
                `radial-gradient(80% 55% at 50% 60%, color-mix(in oklch, var(--tc-primary) 35%, transparent) 0%, color-mix(in oklch, var(--tc-accent) 25%, transparent) 25%, color-mix(in oklch, var(--tc-primary) 10%, rgba(var(--av-base-rgb),0.4)) 45%, rgba(var(--av-base-rgb),0.85) 65%, var(--av-base) 85%)`,
                `radial-gradient(70% 50% at 12% 30%, color-mix(in oklch, var(--tc-primary) 40%, transparent) 0%, color-mix(in oklch, var(--tc-accent) 20%, transparent) 30%, transparent 60%)`,
                `radial-gradient(60% 45% at 88% 45%, color-mix(in oklch, var(--tc-accent) 25%, transparent) 0%, transparent 55%)`,
                `linear-gradient(to bottom, rgba(var(--av-base-rgb),0.3), transparent 40%)`,
              ].join(','),
              backgroundColor: 'var(--av-base)',
            }}
          />
          {/* Vignette edges */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(140% 120% at 50% 30%, transparent 55%, var(--av-vignette))`,
            }}
          />
        </div>


{/* Central glow — breathing animation (dark mode only) */}
        <div
          className="av-glow-anim pointer-events-none absolute left-1/2 top-[78%] h-52 w-64 -translate-x-1/2 rounded-full sm:h-56 sm:w-80 hidden dark:block"
          style={{
            background: `radial-gradient(ellipse, color-mix(in oklch, var(--tc-primary) 50%, transparent) 0%, color-mix(in oklch, var(--tc-accent) 30%, transparent) 40%, transparent 70%)`,
            filter: 'blur(60px)',
            animation: 'av-glow-breathe 8s ease-in-out infinite',
          }}
        />

        {/* Bottom gradient fade — smooth transition to next section */}
        <div
          className="absolute bottom-0 left-0 right-0 h-40 z-[1] bg-gradient-to-t from-white to-transparent dark:from-[#0d0a12] dark:to-transparent"
        />
      </div>
    </div>
  );
}

/* ── Main component ── */
export function LandingAiVision() {
  const sectionRef = useScrollReveal<HTMLElement>();

  return (
    <section ref={sectionRef} id="ai-vision" className="relative scroll-mt-20">
      {/* ── Background (matches pricing page) ── */}
      <AiVisionBackground />

      {/* ── Content ── */}
      <div className="relative z-[2] mx-auto max-w-6xl px-4 py-24 sm:py-32">
        {/* Badge */}
        <SectionBadge label="AI Vision" />

        {/* Heading */}
        <SectionHeading className="max-w-2xl">
          Your Data Flows In.
          <br />
          Insights Come Out.
        </SectionHeading>

        {/* Description */}
        <p
          className="scroll-reveal mt-5 text-base text-muted-foreground leading-relaxed max-w-lg"
          style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
        >
          Feed your trades to the AI and it detects patterns, scores your performance health,
          and tracks every metric across time — so you always know where you stand.
        </p>

        {/* ── Feature strip ── */}
        <div
          className="scroll-reveal relative mt-6 flex flex-wrap gap-3"
          style={{ '--reveal-delay': '250ms' } as React.CSSProperties}
        >
          {FEATURE_PILLS.map((pill) => {
            const Icon = pill.icon;
            return (
              <div
                key={pill.title}
                className="group relative flex items-center gap-2.5 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm px-4 py-2 transition-colors hover:border-[color-mix(in_oklch,var(--tc-primary)_30%,transparent)]"
              >
                <Icon className="size-3.5 shrink-0" style={{ color: 'var(--tc-primary)' }} />
                <span className="text-xs font-medium text-foreground whitespace-nowrap">{pill.title}</span>
              </div>
            );
          })}
        </div>

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
                  <Bot className="h-7 w-7 text-white relative z-10" />
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

      </div>
    </section>
  );
}
