'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ChevronRight, CalendarDays, BarChart3, TableProperties, ArrowUp, ArrowDown } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BGPattern } from '@/components/ui/bg-pattern';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import type { EquityPoint } from '@/components/dashboard/analytics/EquityCurveChart';

/* ── Mock data ── */

const MOCK_TRADES = [
  { symbol: 'NQ', name: 'NAS100', time: '10:00 – 11:30', direction: 'Long' as const, rr: '2.5', pnl: '+$580', pnlPositive: true, outcome: 'Win' as const, risk: '0.50%', screen: 'https://www.tradingview.com/x/jQunmvqG/' },
  { symbol: 'ES', name: 'SP500', time: '11:45 – 12:30', direction: 'Short' as const, rr: '1.8', pnl: '-$260', pnlPositive: false, outcome: 'Lose' as const, risk: '0.50%', screen: 'https://www.tradingview.com/x/ljnfQy4G/' },
  { symbol: 'GC', name: 'XAUUSD', time: '14:00 – 15:15', direction: 'Long' as const, rr: '3.2', pnl: '+$1,100', pnlPositive: true, outcome: 'Win' as const, risk: '0.35%', screen: 'https://www.tradingview.com/x/h87FdCLo/' },
];

const MOCK_STATS = [
  { label: 'Total Trades', value: '3', color: 'text-slate-900 dark:text-slate-100' },
  { label: 'Wins', value: '2', color: 'text-emerald-500' },
  { label: 'Losses', value: '1', color: 'text-rose-500' },
  { label: 'BE', value: '0', color: 'text-slate-600 dark:text-slate-300' },
  { label: 'P&L %', value: '1.78%', color: 'text-slate-900 dark:text-slate-100' },
  { label: 'Winrate', value: '67%', color: 'text-slate-900 dark:text-slate-100' },
  { label: 'Profit Factor', value: '2.53', color: 'text-slate-900 dark:text-slate-100' },
  { label: 'Consistency', value: '67%', color: 'text-slate-900 dark:text-slate-100' },
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

/* ── Main component ── */

export function LandingDailyJournal() {
  const sectionRef = useScrollReveal<HTMLElement>();
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  /* Auto-expand on enter, collapse on leave — repeatable */
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          expandTimerRef.current = setTimeout(() => {
            setIsExpanded(true);
          }, 500);
        } else {
          if (expandTimerRef.current) {
            clearTimeout(expandTimerRef.current);
            expandTimerRef.current = null;
          }
          setIsExpanded(false);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(card);
    return () => {
      observer.disconnect();
      if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
    };
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

        {/* ── Bottom: Full-width mock daily card ── */}
        <div
          ref={cardRef}
          className="scroll-reveal"
          style={{ '--reveal-delay': '400ms' } as React.CSSProperties}
        >
          <div className="relative rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden">
            {/* Card header — date + toggle */}
            <div
              role="button"
              tabIndex={0}
              onClick={toggleExpand}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleExpand();
                }
              }}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <ChevronRight
                  className={cn(
                    'h-4 w-4 text-slate-400 transition-transform duration-200',
                    isExpanded ? 'rotate-90' : 'rotate-0',
                  )}
                />
                <div className="gap-1 flex flex-col">
                  <p className="text-base font-semibold text-slate-100">
                    Thu, Feb 12, 2026
                  </p>
                  <p className="text-sm text-slate-400">
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
                  toggleExpand();
                }}
                className="h-8 rounded-xl px-3 text-xs cursor-pointer transition-colors duration-200 border border-slate-700/80 bg-slate-900/40 text-slate-200 hover:bg-slate-800/70 hover:text-slate-50 hover:border-slate-600/80 font-medium"
              >
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>

            {/* Equity curve + header stats — always visible (outside collapse) */}
            <div className="px-5 py-4">
              <div className="flex flex-col gap-10 md:flex-row md:items-center">
                {/* Equity curve — real EquityCurveChart, 1/3 width like real card */}
                <div className="md:w-1/3 h-32 flex items-center">
                  <EquityCurveChart
                    data={MOCK_EQUITY_DATA}
                    currencySymbol="$"
                    hasTrades={true}
                    variant="card"
                    hideAxisLabels
                  />
                </div>

                {/* Stats grid — 2 rows of 4, matching real DailyJournalClient */}
                <div className="flex-1 md:flex md:items-center">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-20 gap-y-6 text-xs sm:text-sm w-full">
                    {MOCK_STATS.map((stat) => (
                      <div key={stat.label}>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">
                          {stat.label}
                        </p>
                        <p className={cn('text-base font-semibold', stat.color)}>
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
                'border-t border-slate-700/60 px-5 overflow-hidden transition-all duration-500 ease-in-out',
                isExpanded ? 'max-h-[1200px] py-4 opacity-100' : 'max-h-0 py-0 opacity-0',
              )}
            >
              <div className="relative overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700/30">
                  <thead className="bg-transparent border-b border-slate-700/70">
                    <tr>
                      {['Screens', 'Time', 'Market', 'P&L', 'Direction', 'RR', 'Outcome', 'Risk', 'Notes', 'Actions'].map((col) => (
                        <th
                          key={col}
                          className="px-3 py-3 text-left text-[10px] sm:text-xs font-semibold text-slate-400 uppercase tracking-wider"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/20">
                    {MOCK_TRADES.map((trade) => (
                      <tr key={trade.symbol} className="hover:bg-slate-800/40 transition-colors">
                        {/* Screens — trade chart screenshot */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="relative w-[140px] h-[75px] rounded-lg border border-slate-300/40 dark:border-slate-600/30 bg-slate-100 dark:bg-slate-700/30 overflow-hidden">
                            <Image
                              src={trade.screen}
                              alt={`${trade.name} chart`}
                              className="w-full h-full object-cover"
                              width={140}
                              height={75}
                              unoptimized
                            />
                            <span className="absolute top-1.5 right-1.5 text-[9px] font-medium text-slate-300 bg-slate-800/80 backdrop-blur-sm rounded px-1.5 py-0.5">
                              1/2
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-300 whitespace-nowrap">
                          {trade.time}
                        </td>
                        <td className="px-3 py-3 text-sm font-medium text-slate-100 whitespace-nowrap">
                          {trade.name}
                        </td>
                        <td className={cn('px-3 py-3 text-sm font-semibold whitespace-nowrap', trade.pnlPositive ? 'text-emerald-400' : 'text-rose-400')}>
                          {trade.pnl}
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            {trade.direction === 'Long' ? (
                              <ArrowUp className="h-3 w-3 text-emerald-400" />
                            ) : (
                              <ArrowDown className="h-3 w-3 text-rose-400" />
                            )}
                            {trade.direction}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-300 whitespace-nowrap">
                          {trade.rr} <span className="text-xs text-slate-500">R</span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <Badge
                            className={cn(
                              'shadow-none border-none outline-none ring-0 text-white',
                              trade.outcome === 'Win'
                                ? 'bg-emerald-500 dark:bg-emerald-500'
                                : 'bg-rose-500 dark:bg-rose-500',
                            )}
                          >
                            {trade.outcome}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-sm text-slate-400 whitespace-nowrap">
                          {trade.risk}
                        </td>
                        {/* Notes */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="text-sm text-slate-300 underline underline-offset-2 decoration-slate-600 cursor-default">
                            View Notes
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className="text-sm text-slate-300 underline underline-offset-2 decoration-slate-600 cursor-default">
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
