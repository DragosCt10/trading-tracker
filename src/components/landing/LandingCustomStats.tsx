'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  LayoutGrid,
  SlidersHorizontal,
  Filter,
  Compass,
  TrendingUp,
  Pencil,
  Eye,
  BarChart3,
  Target,
  Activity,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { EquityCurveChart } from '@/components/dashboard/analytics/EquityCurveChart';
import type { EquityPoint } from '@/components/dashboard/analytics/EquityCurveChart';
import { TotalTradesDonut } from '@/components/dashboard/analytics/TotalTradesChartCard';
import { SummaryHalfGauge } from '@/components/dashboard/analytics/SummaryHalfGauge';
import { AvgWinLossCard } from '@/components/dashboard/analytics/AvgWinLossCard';
import { ExpectancyCard } from '@/components/dashboard/analytics/ExpectancyCard';
import { RecoveryFactorChart } from '@/components/dashboard/analytics/RecoveryFactorChart';
import { Columns2, PanelLeft } from 'lucide-react';
import { TradeCard } from '@/components/trades/TradeCard';
import type { Trade } from '@/types/trade';
import {
  ChipGroup,
  FieldRow,
  INPUT_CLASS,
  SESSION_OPTIONS,
  QUARTERS,
  MSS_OPTIONS,
  TREND_OPTIONS,
  FVG_SIZE_OPTIONS,
} from '@/components/CustomStatModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

/* ── Step 1: Modal mockup using real CustomStatModal components ── */

const noop = () => {};

function ModalMockup() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hovering = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let lastTime = 0;
    const speed = 30; // px per second

    function tick(time: number) {
      if (lastTime && !hovering.current) {
        const delta = (time - lastTime) / 1000;
        const maxScroll = el!.scrollHeight - el!.clientHeight;
        el!.scrollTop += delta * speed;
        // Loop back to top when reaching the bottom
        if (el!.scrollTop >= maxScroll) {
          el!.scrollTop = 0;
        }
      }
      lastTime = time;
      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm shadow-md overflow-hidden flex flex-col max-h-[480px]">
      {/* Modal header — mirrors CustomStatModal header */}
      <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 shrink-0">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            <div className="p-2 rounded-lg themed-header-icon-box">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <span>Create Custom Stat</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Define a filter combination. You must select at least one filter to create a custom stat.
          </p>
        </div>
      </div>

      {/* Scrollable form — auto-scrolls, pauses on hover */}
      <div
        ref={scrollRef}
        onMouseEnter={() => { hovering.current = true; }}
        onMouseLeave={() => { hovering.current = false; }}
        className="overflow-y-auto flex-1 px-6 py-5 custom-scrollbar"
      >
        <div className="space-y-5">
          {/* Name */}
          <FieldRow label="Name *">
            <Input
              value="Long DAX Morning"
              readOnly
              className={INPUT_CLASS}
            />
          </FieldRow>

          <Separator />

          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Filter Criteria
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Direction */}
            <FieldRow label="Direction">
              <ChipGroup
                options={[
                  { label: 'Long', value: 'Long' },
                  { label: 'Short', value: 'Short' },
                ]}
                value="Long"
                onChange={noop}
              />
            </FieldRow>

            {/* Trade Outcome */}
            <FieldRow label="Trade Outcome">
              <ChipGroup
                options={[
                  { label: 'Win', value: 'Win' },
                  { label: 'Lose', value: 'Lose' },
                  { label: 'BE', value: 'BE' },
                ]}
                value="Win"
                onChange={noop}
              />
            </FieldRow>
          </div>

          {/* Market */}
          <FieldRow label="Market">
            <Input
              value="DAX (GER40)"
              readOnly
              className={INPUT_CLASS}
            />
          </FieldRow>

          {/* Session */}
          <FieldRow label="Session">
            <ChipGroup
              options={SESSION_OPTIONS.map((s) => ({ label: s, value: s }))}
              value="London"
              onChange={noop}
            />
          </FieldRow>

          {/* Quarter */}
          <FieldRow label="Quarter">
            <ChipGroup
              options={QUARTERS.map((q) => ({ label: q, value: q }))}
              value="Q1"
              onChange={noop}
            />
          </FieldRow>

          <Separator />

          {/* Booleans */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FieldRow label="Execution">
              <ChipGroup
                options={[
                  { label: 'Executed', value: true },
                  { label: 'Not Executed', value: false },
                ]}
                value={true}
                onChange={noop}
              />
            </FieldRow>

            <FieldRow label="News Related">
              <ChipGroup
                options={[
                  { label: 'Yes', value: true },
                  { label: 'No', value: false },
                ]}
                value={undefined}
                onChange={noop}
              />
            </FieldRow>

            <FieldRow label="Re-entry">
              <ChipGroup
                options={[
                  { label: 'Yes', value: true },
                  { label: 'No', value: false },
                ]}
                value={undefined}
                onChange={noop}
              />
            </FieldRow>

            <FieldRow label="Partials Taken">
              <ChipGroup
                options={[
                  { label: 'Yes', value: true },
                  { label: 'No', value: false },
                ]}
                value={undefined}
                onChange={noop}
              />
            </FieldRow>
          </div>

          <Separator />

          {/* Confidence & Mind State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800 shadow-sm">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Confidence at Entry
              </p>
              <ChipGroup
                options={[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))}
                value={4}
                onChange={noop}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selected: Good
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Mind State at Entry
              </p>
              <ChipGroup
                options={[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))}
                value={undefined}
                onChange={noop}
              />
            </div>
          </div>

          <Separator />

          {/* Strategy-specific Filters */}
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Strategy-specific Filters</p>

          {/* Pattern / Setup */}
          <FieldRow label="Pattern / Setup">
            <Input
              value=""
              readOnly
              placeholder="Any setup"
              className={INPUT_CLASS}
            />
          </FieldRow>

          {/* Liquidity / Conditions */}
          <FieldRow label="Liquidity / Conditions">
            <Input
              value=""
              readOnly
              placeholder="Any condition"
              className={INPUT_CLASS}
            />
          </FieldRow>

          {/* MSS */}
          <FieldRow label="MSS">
            <Select value="__any__" onValueChange={noop}>
              <SelectTrigger className={INPUT_CLASS}>
                <SelectValue placeholder="Any MSS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any</SelectItem>
                {MSS_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Trend */}
          <FieldRow label="Trend">
            <Select value="__any__" onValueChange={noop}>
              <SelectTrigger className={INPUT_CLASS}>
                <SelectValue placeholder="Any trend" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any__">Any</SelectItem>
                {TREND_OPTIONS.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          {/* Local H/L & Launch Hour */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FieldRow label="Local H/L Taken">
              <ChipGroup
                options={[
                  { label: 'Yes', value: true },
                  { label: 'No', value: false },
                ]}
                value={undefined}
                onChange={noop}
              />
            </FieldRow>

            <FieldRow label="Launch Hour">
              <ChipGroup
                options={[
                  { label: 'Yes', value: true },
                  { label: 'No', value: false },
                ]}
                value={undefined}
                onChange={noop}
              />
            </FieldRow>
          </div>

          {/* FVG Size */}
          <FieldRow label="FVG Size">
            <ChipGroup
              options={FVG_SIZE_OPTIONS.map((n) => ({ label: String(n), value: n }))}
              value={undefined}
              onChange={noop}
            />
          </FieldRow>

          {/* Tags */}
          <FieldRow label="Tags">
            <div className="flex flex-wrap gap-2">
              {['ICT', 'SMC', 'Sweep'].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-2 rounded-lg border text-sm font-medium bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all duration-200 cursor-pointer"
                >
                  {tag}
                </span>
              ))}
            </div>
          </FieldRow>

          {/* Action buttons — mirrors CustomStatModal */}
          <div className="flex justify-end gap-3 pt-5">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 [&_svg]:text-white"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                Create
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Custom stat card mockup ── */

/* Mock equity data for the card chart */
const MOCK_EQUITY: EquityPoint[] = [
  { date: '2026-01-06T09:00:00', profit: 0 },
  { date: '2026-01-07T10:00:00', profit: 420 },
  { date: '2026-01-08T11:00:00', profit: 280 },
  { date: '2026-01-09T14:00:00', profit: 860 },
  { date: '2026-01-13T09:30:00', profit: 1100 },
  { date: '2026-01-14T10:00:00', profit: 980 },
  { date: '2026-01-15T11:00:00', profit: 1450 },
  { date: '2026-01-16T14:00:00', profit: 1900 },
  { date: '2026-01-20T09:00:00', profit: 2200 },
  { date: '2026-01-21T10:30:00', profit: 2050 },
  { date: '2026-01-22T11:00:00', profit: 2600 },
  { date: '2026-01-23T14:00:00', profit: 2800 },
  { date: '2026-01-27T09:30:00', profit: 3200 },
];

const CARD_PILLS = ['Long', 'DAX', 'London', 'Win', 'Q1'];

function CardMockup() {
  return (
    <div className="max-w-sm mx-auto">
      <Card className="rounded-2xl border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm overflow-hidden">
        {/* Equity chart — exact same as CustomStatCardItem */}
        <div className="h-24 w-full px-3 pt-3">
          <EquityCurveChart
            data={MOCK_EQUITY}
            currencySymbol="$"
            hasTrades
            isLoading={false}
            variant="card"
            hideAxisLabels
          />
        </div>

        {/* Card info — exact same structure as CustomStatCardItem */}
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-1 min-w-0">
              Long DAX Morning
            </p>
            <div className="flex items-start shrink-0">
              <div className="inline-flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  +6.40%
                </span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-end justify-between gap-4 mt-2">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Win Rate</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">62%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Trades</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">14</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">Net P&amp;L</p>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">+$3,200.00</p>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-1 mt-3">
            {CARD_PILLS.map((pill) => (
              <span
                key={pill}
                className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300"
              >
                {pill}
              </span>
            ))}
          </div>

          {/* Bottom action row */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/50">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-xl px-3 text-xs cursor-pointer transition-colors duration-200 border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 font-medium"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-400 underline underline-offset-2">
              <Eye className="h-3 w-3" />
              View Details
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── Step 3: Detail dashboard mockup ── */

/* Mock trades for real dashboard components in Step 3 */
function placeholderSvg(label: string) {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect fill='%231e293b' width='640' height='360'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' font-weight='600' fill='%2364748b'%3E${encodeURIComponent(label)}%3C/text%3E%3C/svg%3E`;
}

const MOCK_DASHBOARD_TRADES: Trade[] = [
  { id: 'm1', trade_date: '2026-01-06', trade_time: '09:30', market: 'DAX', direction: 'Long', trade_outcome: 'Win', calculated_profit: 420, risk_reward: 2.5, risk_percentage: 0.5, executed: true, break_even: false, trade_screens: [placeholderSvg('Image 1'), placeholderSvg('Image 2')], trade_screen_timeframes: ['4H', '1H'], strategy_id: '', user_id: '', created_at: '', updated_at: '' },
  { id: 'm2', trade_date: '2026-01-07', trade_time: '10:15', market: 'DAX', direction: 'Long', trade_outcome: 'Lose', calculated_profit: -150, risk_reward: 0, risk_percentage: 0.5, executed: true, break_even: false, trade_screens: [placeholderSvg('Image 1'), placeholderSvg('Image 2'), placeholderSvg('Image 3'), placeholderSvg('Image 4')], trade_screen_timeframes: ['15m', '5m', '1H', '4H'], strategy_id: '', user_id: '', created_at: '', updated_at: '' },
  { id: 'm3', trade_date: '2026-01-08', trade_time: '09:45', market: 'DAX', direction: 'Long', trade_outcome: 'Win', calculated_profit: 580, risk_reward: 3.2, risk_percentage: 0.5, executed: true, break_even: false, trade_screens: [placeholderSvg('Image 1'), placeholderSvg('Image 2'), placeholderSvg('Image 3')], trade_screen_timeframes: ['1H', '15m', '5m'], strategy_id: '', user_id: '', created_at: '', updated_at: '' },
  { id: 'm4', trade_date: '2026-01-09', trade_time: '10:00', market: 'DAX', direction: 'Long', trade_outcome: 'Win', calculated_profit: 300, risk_reward: 1.8, risk_percentage: 0.5, executed: true, break_even: false, trade_screens: [placeholderSvg('Image 1'), placeholderSvg('Image 2')], trade_screen_timeframes: ['4H', '15m'], strategy_id: '', user_id: '', created_at: '', updated_at: '' },
] as unknown as Trade[];

const DASHBOARD_CARD_CLASS = 'relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm';

function DashboardMockup() {
  const netPnl = MOCK_DASHBOARD_TRADES.reduce((s, t) => s + (t.calculated_profit ?? 0), 0);
  const pnlPct = (netPnl / 50000) * 100;
  const wins = MOCK_DASHBOARD_TRADES.filter((t) => t.trade_outcome === 'Win').length;
  const losses = MOCK_DASHBOARD_TRADES.filter((t) => t.trade_outcome === 'Lose').length;
  const winRate = (wins / MOCK_DASHBOARD_TRADES.length) * 100;
  const noop = () => {};

  return (
    <div className="rounded-2xl border border-slate-700/50 backdrop-blur-sm shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-start gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg themed-header-icon-box shrink-0">
                <LayoutGrid className="h-4 w-4" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Long DAX Morning
              </h3>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {['Long', 'DAX', 'London', 'Win', 'Q1', 'Conf: 4', 'Executed'].map((pill) => (
                <span
                  key={pill}
                  className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300"
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="px-5 sm:px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Net P&L */}
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardContent className="p-4 flex flex-col h-full">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Net P&amp;L</p>
                  <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                    ${netPnl.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    +{pnlPct.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-[80px]">
                <EquityCurveChart
                  data={MOCK_EQUITY}
                  currencySymbol="$"
                  hasTrades
                  isLoading={false}
                  variant="card"
                  hideAxisLabels
                />
              </div>
            </CardContent>
          </Card>

          {/* Total Trades */}
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardContent className="p-4 flex flex-col h-full">
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Total Trades</p>
              </div>
              <div className="flex-1 h-32 min-h-[7rem] w-full">
                <TotalTradesDonut
                  totalTrades={MOCK_DASHBOARD_TRADES.length}
                  wins={wins}
                  losses={losses}
                  beTrades={0}
                  variant="compact"
                />
              </div>
            </CardContent>
          </Card>

          {/* Win Rate */}
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardContent className="p-4 flex flex-col h-full">
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Win Rate</p>
              </div>
              <div className="flex-1 h-32 min-h-[7rem] relative w-full">
                <SummaryHalfGauge
                  variant="winRate"
                  valueNormalized={winRate}
                  centerLabel={`${winRate.toFixed(0)}%`}
                  minLabel="0%"
                  maxLabel="100%"
                />
              </div>
            </CardContent>
          </Card>

          {/* Avg Drawdown */}
          <Card className={DASHBOARD_CARD_CLASS}>
            <CardContent className="p-4 flex flex-col h-full">
              <div className="mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Avg Drawdown</p>
              </div>
              <div className="flex-1 h-32 min-h-[7rem] relative w-full">
                <SummaryHalfGauge
                  variant="avgDrawdown"
                  valueNormalized={2.25}
                  centerLabel="0.45%"
                  minLabel="0%"
                  maxLabel="20%"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
          <AvgWinLossCard trades={MOCK_DASHBOARD_TRADES} currencySymbol="$" isPro />
          <ExpectancyCard trades={MOCK_DASHBOARD_TRADES} currencySymbol="$" isPro />
          <RecoveryFactorChart recoveryFactor={4.8} isPro />
        </div>

        {/* Trades section — exact same controls as CustomStatDetailView */}
        <div className="mt-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Trades</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {MOCK_DASHBOARD_TRADES.length} trades matching these filters
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">Sort by:</span>
                <span className="inline-flex items-center h-8 px-3 text-xs rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-900 dark:text-slate-50">
                  Date
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 whitespace-nowrap">View:</span>
              <div className="inline-flex h-8 items-center rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-none p-0.5">
                <span className="rounded-lg h-6 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Columns2 className="h-4 w-4" />
                </span>
                <span className="rounded-lg h-6 px-2.5 py-1 text-xs font-medium bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm">
                  <LayoutGrid className="h-4 w-4" />
                </span>
                <span className="rounded-lg h-6 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <PanelLeft className="h-4 w-4" />
                </span>
                <span className="rounded-lg h-6 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  Table
                </span>
              </div>
            </div>
          </div>

          {/* Trade cards grid */}
          <div className="grid gap-4 items-stretch [&>*]:h-full grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            {MOCK_DASHBOARD_TRADES.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                onOpenModal={noop}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

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
        <h2
          className="scroll-reveal mt-6 text-center text-3xl sm:text-4xl lg:text-[42px] font-medium leading-[1.12] tracking-[-0.03em] bg-clip-text text-transparent"
          style={{
            backgroundImage:
              'linear-gradient(to bottom, var(--foreground) 40%, var(--tc-accent))',
            '--reveal-delay': '100ms',
          } as React.CSSProperties}
        >
          Your Edge, Quantified.
        </h2>

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
            {STEPS.map((s, i) => (
              <button
                key={s.number}
                type="button"
                onClick={() => handleStepClick(i)}
                className={cn(
                  'flex items-center justify-center gap-2 w-[7.5rem] h-10 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer border',
                  activeStep === i
                    ? 'themed-header-icon-box shadow-sm'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                )}
              >
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
              </button>
            ))}
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
