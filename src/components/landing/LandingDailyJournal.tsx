'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ChevronRight, CalendarDays, BarChart3, TableProperties, ArrowUp, ArrowDown, MoveHorizontal } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BGPattern } from '@/components/ui/bg-pattern';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import type { EquityPoint } from '@/components/dashboard/analytics/EquityCurveChart';

/* ── Mock data ── */

const MOCK_TRADES = [
  { symbol: 'NQ', name: 'NAS100', time: '10:00 – 11:59', direction: 'Long' as const, rr: '2.5', pnl: '+$580', pnlPositive: true, outcome: 'Win' as const, risk: '0.50%', screen: 'https://www.tradingview.com/x/jQunmvqG/' },
  { symbol: 'ES', name: 'SP500', time: '12:00 – 13:59', direction: 'Short' as const, rr: '1.8', pnl: '-$260', pnlPositive: false, outcome: 'Lose' as const, risk: '0.50%', screen: 'https://www.tradingview.com/x/ljnfQy4G/' },
  { symbol: 'GC', name: 'XAUUSD', time: '14:00 – 15:59', direction: 'Long' as const, rr: '3.2', pnl: '+$1,100', pnlPositive: true, outcome: 'Win' as const, risk: '0.35%', screen: 'https://www.tradingview.com/x/h87FdCLo/' },
];

const MOCK_STATS = [
  { label: 'Total Trades', value: '3', lightColor: 'text-slate-900', darkColor: 'text-slate-100' },
  { label: 'Wins', value: '2', lightColor: 'text-emerald-600', darkColor: 'text-emerald-500' },
  { label: 'Losses', value: '1', lightColor: 'text-rose-600', darkColor: 'text-rose-500' },
  { label: 'BE', value: '0', lightColor: 'text-slate-600', darkColor: 'text-slate-300' },
  { label: 'P&L %', value: '1.78%', lightColor: 'text-slate-900', darkColor: 'text-slate-100' },
  { label: 'Winrate', value: '67%', lightColor: 'text-slate-900', darkColor: 'text-slate-100' },
  { label: 'Profit Factor', value: '2.53', lightColor: 'text-slate-900', darkColor: 'text-slate-100' },
  { label: 'Consistency', value: '67%', lightColor: 'text-slate-900', darkColor: 'text-slate-100' },
];

const FEATURES = [
  { icon: CalendarDays, title: 'Day-by-day breakdown', description: 'Every trading session grouped by date with full stats and equity curve.' },
  { icon: BarChart3, title: 'Per-day analytics', description: 'Winrate, profit factor, and consistency calculated for each individual day.' },
  { icon: TableProperties, title: 'Trade-level detail', description: 'Expand any day to see every trade with screenshots, notes, and outcomes.' },
];

/* Mock equity curve data — cumulative profit per trade */
const MOCK_EQUITY_DATA: EquityPoint[] = [
  { date: '2026-02-12T10:00:00', profit: 0 },
  { date: '2026-02-12T11:30:00', profit: 580 },
  { date: '2026-02-12T12:30:00', profit: 320 },
  { date: '2026-02-12T15:15:00', profit: 1420 },
];

/* ── Theme-aware card content ── */

function DailyJournalCardContent({
  theme,
  isExpanded,
  onToggle,
}: {
  theme: 'light' | 'dark';
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'rounded-2xl border text-card-foreground backdrop-blur-sm overflow-hidden',
        isDark
          ? 'border-slate-700/50 bg-slate-800/30 shadow-none'
          : 'border-slate-300/40 bg-[#f5f5f7] shadow-md shadow-slate-200/50',
      )}
    >
      {/* Card header — date + toggle */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          'w-full flex items-center justify-between px-5 py-4 text-left transition-colors cursor-pointer',
          isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100/60',
        )}
      >
        <div className="flex items-center gap-3">
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-transform duration-200',
              isDark ? 'text-slate-400' : 'text-slate-500',
              isExpanded ? 'rotate-90' : 'rotate-0',
            )}
          />
          <div className="gap-1 flex flex-col">
            <p className={cn('text-base font-semibold', isDark ? 'text-slate-100' : 'text-slate-900')}>
              Thu, Feb 12, 2026
            </p>
            <p className={cn('text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
              3 trades &bull; P&L:{' '}
              <span className="text-emerald-500">
                <strong>$1,420</strong>
              </span>
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            'h-8 rounded-xl px-3 text-xs cursor-pointer transition-colors duration-200 font-medium border',
            isDark
              ? 'border-slate-700/80 bg-slate-900/40 text-slate-200 hover:bg-slate-800/70 hover:text-slate-50 hover:border-slate-600/80'
              : 'border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80',
          )}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {/* Equity curve + header stats */}
      <div className="px-5 py-4">
        <div className="flex flex-col gap-10 md:flex-row md:items-center">
          {/* Equity curve */}
          <div className="md:w-1/3 h-32 flex items-center">
            <EquityCurveChart
              data={MOCK_EQUITY_DATA}
              currencySymbol="$"
              hasTrades={true}
              variant="card"
              hideAxisLabels
            />
          </div>

          {/* Stats grid */}
          <div className="flex-1 md:flex md:items-center">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-20 gap-y-6 text-xs sm:text-sm w-full">
              {MOCK_STATS.map((stat) => (
                <div key={stat.label}>
                  <p className={cn('text-[11px] uppercase tracking-wide', isDark ? 'text-slate-400' : 'text-slate-500')}>
                    {stat.label}
                  </p>
                  <p className={cn('text-base font-semibold', isDark ? stat.darkColor : stat.lightColor)}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible trade table */}
      <div
        className={cn(
          'border-t px-5 overflow-hidden transition-all duration-500 ease-in-out',
          isDark ? 'border-slate-700/60' : 'border-slate-200/70',
          isExpanded ? 'max-h-[1200px] py-4 opacity-100' : 'max-h-0 py-0 opacity-0',
        )}
      >
        <div className="relative overflow-x-auto">
          <table className={cn('min-w-full divide-y', isDark ? 'divide-slate-700/30' : 'divide-slate-200/30')}>
            <thead className={cn('bg-transparent border-b', isDark ? 'border-slate-700/70' : 'border-slate-200/70')}>
              <tr>
                {['Screens', 'Time', 'Market', 'P&L', 'Direction', 'RR', 'Outcome', 'Risk', 'Notes', 'Actions'].map((col) => (
                  <th
                    key={col}
                    className={cn(
                      'px-3 py-3 text-left text-[10px] sm:text-xs font-semibold uppercase tracking-wider',
                      isDark ? 'text-slate-400' : 'text-slate-600',
                    )}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className={cn('divide-y', isDark ? 'divide-slate-700/30' : 'divide-slate-200/30')}>
              {MOCK_TRADES.map((trade) => (
                <tr
                  key={trade.symbol}
                  className={cn('transition-colors', isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50/80')}
                >
                  {/* Screens */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div
                      className={cn(
                        'relative w-[140px] h-[75px] rounded-lg overflow-hidden',
                        isDark ? 'border-slate-600/30 bg-slate-700/30' : 'border-slate-200 bg-slate-100',
                      )}
                    >
                      <Image
                        src={trade.screen}
                        alt={`${trade.name} chart`}
                        className="w-full h-full object-cover"
                        width={140}
                        height={75}
                        unoptimized
                      />
                      <span
                        className={cn(
                          'absolute top-1.5 right-1.5 text-[9px] font-medium backdrop-blur-sm rounded px-1.5 py-0.5',
                          isDark ? 'text-slate-300 bg-slate-800/80' : 'text-slate-600 bg-white/80',
                        )}
                      >
                        1/2
                      </span>
                    </div>
                  </td>
                  {/* Time */}
                  <td className={cn('px-3 py-3 text-sm whitespace-nowrap', isDark ? 'text-slate-300' : 'text-slate-700')}>
                    {trade.time}
                  </td>
                  {/* Market */}
                  <td className={cn('px-3 py-3 text-sm font-medium whitespace-nowrap', isDark ? 'text-slate-100' : 'text-slate-900')}>
                    {trade.name}
                  </td>
                  {/* P&L */}
                  <td
                    className={cn(
                      'px-3 py-3 text-sm font-semibold whitespace-nowrap',
                      trade.pnlPositive
                        ? 'text-emerald-500 font-semibold'
                        : 'text-rose-500 font-semibold',
                    )}
                  >
                    {trade.pnl}
                  </td>
                  {/* Direction */}
                  <td className={cn('px-3 py-3 text-sm whitespace-nowrap', isDark ? 'text-slate-300' : 'text-slate-700')}>
                    <span className="inline-flex items-center gap-1">
                      {trade.direction === 'Long' ? (
                        <ArrowUp className={cn('h-3 w-3', isDark ? 'text-emerald-400' : 'text-emerald-500')} />
                      ) : (
                        <ArrowDown className={cn('h-3 w-3', isDark ? 'text-rose-400' : 'text-rose-500')} />
                      )}
                      {trade.direction}
                    </span>
                  </td>
                  {/* RR */}
                  <td className={cn('px-3 py-3 text-sm whitespace-nowrap', isDark ? 'text-slate-300' : 'text-slate-700')}>
                    {trade.rr} <span className={cn('text-[10px]', isDark ? 'text-slate-500' : 'text-slate-400')}>R</span>
                  </td>
                  {/* Outcome */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <Badge
                      className={cn(
                        'shadow-none border-none outline-none ring-0 text-white',
                        trade.outcome === 'Win' ? 'bg-emerald-500' : 'bg-rose-500',
                      )}
                    >
                      {trade.outcome}
                    </Badge>
                  </td>
                  {/* Risk */}
                  <td className={cn('px-3 py-3 text-sm whitespace-nowrap', isDark ? 'text-slate-400' : 'text-slate-500')}>
                    {trade.risk}
                  </td>
                  {/* Notes */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={cn(
                        'text-sm underline underline-offset-2 cursor-default',
                        isDark ? 'text-slate-300 decoration-slate-600' : 'text-slate-700 decoration-slate-300',
                      )}
                    >
                      View Notes
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={cn(
                        'text-sm underline underline-offset-2 cursor-default',
                        isDark ? 'text-slate-300 decoration-slate-600' : 'text-slate-700 decoration-slate-300',
                      )}
                    >
                      Trade Details
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ── */

export function LandingDailyJournal() {
  const sectionRef = useScrollReveal<HTMLElement>();
  const cardRef = useRef<HTMLDivElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  /* Auto-expand/collapse removed — card starts expanded */

  /* ── Slider drag handling ── */

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: PointerEvent) => {
      e.preventDefault();
      if (!comparisonRef.current) return;
      const rect = comparisonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setSliderPosition(Math.max(5, Math.min(95, (x / rect.width) * 100)));
    };

    const handleUp = () => setIsDragging(false);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDragging]);

  const handleSliderKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((p) => Math.max(5, p - 2));
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((p) => Math.min(95, p + 2));
    }
  }, []);


  return (
    <section ref={sectionRef} id="daily-journal" className="relative scroll-mt-20">
      {/* Theme orbs with grid line details */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute top-[15%] left-1/4 w-[500px] h-[500px] orb-bg-1 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] right-1/4 w-[500px] h-[500px] orb-bg-2 rounded-full blur-3xl" />

        {/* Diagonal stripes over the orbs */}
        <BGPattern variant="dots" mask="fade-edges" size={24} fill="rgba(255,255,255,0.15)" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-[2] mx-auto max-w-6xl px-4 pt-24 sm:pt-32 pb-24 sm:pb-32">
        {/* ── Top: Header + feature cards ── */}
        <div className="mb-14">
          {/* Badge + heading + description (left) | Feature cards (right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <div
                className="scroll-reveal inline-flex items-center gap-2 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none px-4 py-1.5 backdrop-blur-sm mb-5"
                style={{ '--reveal-delay': '0ms' } as React.CSSProperties}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: 'var(--tc-accent)' }}
                />
                <span className="text-sm text-muted-foreground">Daily Journal</span>
              </div>

              <h2
                className="scroll-reveal text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.12] tracking-[-0.03em] bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(to bottom, var(--foreground) 40%, var(--tc-accent))',
                  '--reveal-delay': '100ms',
                } as React.CSSProperties}
              >
                Replay Every Day.
                <br />
                Refine Every Edge.
              </h2>

              <p
                className="scroll-reveal mt-5 text-base text-muted-foreground leading-relaxed max-w-lg"
                style={{ '--reveal-delay': '200ms' } as React.CSSProperties}
              >
                The best traders study each session like game tape. Your daily journal
                groups every trade by date, calculates day-level stats, and lets you
                replay the story of each trading day at a glance.
              </p>
            </div>

            {/* Feature cards — stacked on the right */}
            <div className="flex flex-col gap-3">
              {FEATURES.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="scroll-reveal group rounded-xl border border-slate-300/30 dark:border-slate-700/40 bg-slate-50/30 dark:bg-slate-800/20 backdrop-blur-sm px-4 py-3.5 transition-colors duration-300 hover:border-slate-300/50 dark:hover:border-slate-600/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                    style={{ '--reveal-delay': `${300 + i * 100}ms` } as React.CSSProperties}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: 'color-mix(in oklch, var(--tc-primary) 10%, transparent)',
                          border: '1px solid color-mix(in oklch, var(--tc-primary) 22%, transparent)',
                        }}
                      >
                        <Icon className="h-4.5 w-4.5" style={{ color: 'var(--tc-primary)' }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground/90 mb-0.5">
                          {feature.title}
                        </p>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom: Theme comparison slider ── */}
        <div
          ref={cardRef}
          className="scroll-reveal"
          style={{ '--reveal-delay': '400ms' } as React.CSSProperties}
        >
          {/* Subtle theme labels */}
          <div className="flex justify-between mb-3 px-1">
            <span className="text-xs font-medium tracking-wider uppercase text-slate-400/70">Light</span>
            <span className="text-xs font-medium tracking-wider uppercase text-slate-400/70">Dark</span>
          </div>

          {/* Comparison container */}
          <div
            ref={comparisonRef}
            className="relative rounded-2xl overflow-hidden"
          >
            {/* Dark version — full width (bottom layer) */}
            <DailyJournalCardContent theme="dark" isExpanded={isExpanded} onToggle={toggleExpand} />

            {/* Light version — clipped to left portion (top layer) */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                willChange: isDragging ? 'clip-path' : 'auto',
              }}
            >
              <DailyJournalCardContent theme="light" isExpanded={isExpanded} onToggle={toggleExpand} />
            </div>

            {/* ── Divider line + draggable handle ── */}
            <div
              className="absolute top-0 bottom-0 z-20 pointer-events-none"
              style={{ left: `${sliderPosition}%` }}
            >
              {/* Vertical line */}
              <div
                className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5"
                style={{ backgroundColor: 'var(--tc-primary)' }}
              />

              {/* Glow effect on line */}
              <div
                className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-4 opacity-20 blur-sm"
                style={{ backgroundColor: 'var(--tc-primary)' }}
              />

              {/* Draggable circle handle */}
              <div
                role="slider"
                tabIndex={0}
                aria-label="Drag to compare light and dark themes"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(sliderPosition)}
                className="pointer-events-auto absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center cursor-col-resize touch-none shadow-lg border-2 border-white/30 transition-transform duration-150 hover:scale-110 focus-visible:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                style={{
                  backgroundColor: 'var(--tc-primary)',
                  boxShadow: '0 0 24px color-mix(in oklch, var(--tc-primary) 50%, transparent), 0 4px 12px rgba(0,0,0,0.3)',
                }}
                onPointerDown={handlePointerDown}
                onKeyDown={handleSliderKeyDown}
              >
                <MoveHorizontal className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient blend */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 z-[1]"
        style={{ background: 'linear-gradient(to top, #0d0a12 0%, transparent 100%)' }}
      />
    </section>
  );
}
