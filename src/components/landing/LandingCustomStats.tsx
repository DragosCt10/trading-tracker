'use client';

import { useState, useCallback } from 'react';
import {
  LayoutGrid,
  SlidersHorizontal,
  Filter,
  Compass,
  TrendingUp,
  BarChart3,
  Target,
  Activity,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { SectionHeading } from '@/components/landing/shared';
import { cn } from '@/lib/utils';
import { ModalMockup } from './custom-stats/ModalMockup';
import { CardMockup } from './custom-stats/CardMockup';
import { DashboardMockup } from './custom-stats/DashboardMockup';

/* ── Step definitions ── */

const STEPS = [
  {
    number: 1,
    label: 'Define',
    title: 'Define Your Filters',
    description:
      'Combine any filters to isolate the exact trade subset you want to analyze. Direction, market, session, outcome, confidence — mix and match to uncover hidden patterns in your data.',
    features: [
      {
        icon: Filter,
        title: '20+ filter criteria',
        description:
          'Direction, market, session, outcome, confidence, tags, and more.',
      },
      {
        icon: SlidersHorizontal,
        title: 'Mix & match freely',
        description:
          'Stack multiple filters for laser-focused trade subsets.',
      },
      {
        icon: Compass,
        title: 'Strategy-aware',
        description:
          'Filters adapt to your strategy setup — MSS, evaluation, FVG size.',
      },
    ],
  },
  {
    number: 2,
    label: 'Track',
    title: 'See Your Custom Stat Card',
    description:
      'Once saved, a live card appears on your dashboard. Win rate, trade count, P&L, and equity curve — all auto-calculated from your filtered trades and always up to date.',
    features: [
      {
        icon: TrendingUp,
        title: 'Live equity curve',
        description:
          'A mini chart tracks cumulative P&L for your filtered trades.',
      },
      {
        icon: BarChart3,
        title: 'Key metrics at a glance',
        description: 'Win rate, trade count, and net P&L — always fresh.',
      },
      {
        icon: Zap,
        title: 'Edit anytime',
        description:
          'Refine filters or rename your stat with a single click.',
      },
    ],
  },
  {
    number: 3,
    label: 'Analyze',
    title: 'Dive Into Full Analytics',
    description:
      'Click into any custom stat card and get a complete analytics dashboard — the same depth you get for your full strategy, but scoped to your exact filter combination.',
    features: [
      {
        icon: Target,
        title: 'Full stat breakdown',
        description:
          'Net P&L, win rate, drawdown, expectancy, recovery factor.',
      },
      {
        icon: Activity,
        title: 'Dedicated trade list',
        description:
          'Browse every trade matching your filters with full details.',
      },
      {
        icon: BarChart3,
        title: 'Same depth, narrower focus',
        description:
          'Strategy-level analytics scoped to your custom filter set.',
      },
    ],
  },
] as const;

/* ── Main section ── */

export function LandingCustomStats() {
  const sectionRef = useScrollReveal<HTMLElement>();
  const [activeStep, setActiveStep] = useState(0);

  const handleStepClick = useCallback((index: number) => {
    setActiveStep(index);
  }, []);

  const step = STEPS[activeStep];

  return (
    <section ref={sectionRef} id="custom-stats" className="relative scroll-mt-20">
      {/* Top gradient blend */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(to bottom, #0d0a12 0%, transparent 100%)',
        }}
      />

      {/* Orbs */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden
      >
        <div className="absolute top-[15%] left-1/4 w-[500px] h-[500px] orb-bg-1 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] right-1/4 w-[500px] h-[500px] orb-bg-2 rounded-full blur-3xl" />
      </div>

      <div className="relative z-[2] mx-auto max-w-6xl px-4 py-24 sm:py-32">
        {/* ── Section header ── */}

        {/* Badge */}
        <div
          className="scroll-reveal flex justify-center"
          style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/50 bg-slate-800/30 shadow-md px-4 py-1.5 backdrop-blur-sm">
            <span
              className="h-1.5 w-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: 'var(--tc-accent)' }}
            />
            <span className="text-sm text-muted-foreground">
              Custom Stats Builder
            </span>
          </div>
        </div>

        {/* Heading */}
        <SectionHeading className="mt-6 text-center" revealDelay="100ms">
          Your Edge, Quantified.
        </SectionHeading>

        <p
          className="scroll-reveal mt-4 text-center text-base text-muted-foreground leading-relaxed max-w-lg mx-auto"
          style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
        >
          Build custom filter combinations, track them as stat cards, and dive
          into full analytics — all in three simple steps.
        </p>

        {/* ── Step indicators ── */}
        <div
          className="scroll-reveal mt-10 flex justify-center"
          style={{ '--reveal-delay': '300ms' } as React.CSSProperties}
        >
          <div className="inline-flex items-center gap-1 rounded-full border border-slate-700/50 bg-slate-800/30 p-1.5 backdrop-blur-sm">
            {STEPS.map((s, i) => {
              const isNextStep = i === 1 && activeStep === 0;
              return (
                <motion.button
                  key={s.number}
                  type="button"
                  onClick={() => handleStepClick(i)}
                  className={cn(
                    'relative flex items-center justify-center gap-2 w-[7.5rem] h-10 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer border',
                    activeStep === i
                      ? 'themed-header-icon-box shadow-sm'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  )}
                  animate={
                    isNextStep
                      ? {
                          scale: [1, 1.08, 1],
                          borderColor: [
                            'rgba(139, 92, 246, 0.15)',
                            'rgba(139, 92, 246, 0.7)',
                            'rgba(139, 92, 246, 0.15)',
                          ],
                          boxShadow: [
                            '0 0 0px rgba(139, 92, 246, 0)',
                            '0 0 14px rgba(139, 92, 246, 0.4)',
                            '0 0 0px rgba(139, 92, 246, 0)',
                          ],
                          color: [
                            'rgb(148, 163, 184)',
                            'rgb(226, 232, 240)',
                            'rgb(148, 163, 184)',
                          ],
                        }
                      : {}
                  }
                  transition={
                    isNextStep
                      ? {
                          duration: 2.2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          repeatDelay: 0.6,
                        }
                      : undefined
                  }
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isNextStep && (
                    <motion.span
                      className="absolute inset-0 rounded-full"
                      style={{
                        background:
                          'radial-gradient(ellipse at center, rgba(139, 92, 246, 0.25), transparent 70%)',
                      }}
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        repeatDelay: 0.6,
                      }}
                    />
                  )}
                  <span
                    className={cn(
                      'flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold transition-colors duration-300',
                      activeStep === i
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-700/50 text-slate-400'
                    )}
                  >
                    {s.number}
                  </span>
                  <span className="hidden sm:inline">{s.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* ── Step content ── */}
        <div
          className="scroll-reveal mt-12"
          style={{ '--reveal-delay': '400ms' } as React.CSSProperties}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, filter: 'blur(6px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(6px)' }}
              transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {activeStep < 2 ? (
                /* Steps 1 & 2: two-column layout */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
                  {/* Left: text */}
                  <div className="lg:pt-4">
                    <div className="inline-flex items-center gap-2 mb-4">
                      <span
                        className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: 'color-mix(in oklch, var(--tc-primary) 20%, transparent)',
                          color: 'var(--tc-primary)',
                        }}
                      >
                        {step.number}
                      </span>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        Step {step.number}
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-semibold text-slate-100 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-md">
                      {step.description}
                    </p>

                    <div className="mt-8 space-y-4">
                      {step.features.map((f) => {
                        const Icon = f.icon;
                        return (
                          <div
                            key={f.title}
                            className="flex items-start gap-3"
                          >
                            <div
                              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor:
                                  'color-mix(in oklch, var(--tc-primary) 12%, transparent)',
                                border:
                                  '1px solid color-mix(in oklch, var(--tc-primary) 25%, transparent)',
                              }}
                            >
                              <Icon
                                className="h-4 w-4"
                                style={{ color: 'var(--tc-primary)' }}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-200">
                                {f.title}
                              </p>
                              <p className="mt-0.5 text-sm text-muted-foreground leading-relaxed">
                                {f.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: mockup */}
                  <div>
                    {activeStep === 0 && <ModalMockup />}
                    {activeStep === 1 && <CardMockup />}
                  </div>
                </div>
              ) : (
                /* Step 3: full-width dashboard */
                <div>
                  {/* Header row: title+description left, feature pills right */}
                  <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <span
                          className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
                          style={{
                            backgroundColor: 'color-mix(in oklch, var(--tc-primary) 20%, transparent)',
                            color: 'var(--tc-primary)',
                          }}
                        >
                          3
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-semibold text-slate-100 tracking-tight">
                          {step.title}
                        </h3>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md pl-10">
                        Full analytics dashboard scoped to your custom filter combination.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 shrink-0 lg:mt-1">
                      {step.features.map((f) => {
                        const Icon = f.icon;
                        return (
                          <div
                            key={f.title}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm"
                          >
                            <Icon
                              className="h-3.5 w-3.5"
                              style={{ color: 'var(--tc-primary)' }}
                            />
                            <span className="text-xs font-medium text-slate-300">
                              {f.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Full-width dashboard mockup */}
                  <div className="mx-auto max-w-6xl">
                    <DashboardMockup />
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
