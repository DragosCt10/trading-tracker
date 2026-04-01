'use client';

import { useState, useCallback } from 'react';
import {
  LayoutGrid,
  SlidersHorizontal,
  Filter,
  Compass,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  Eye,
  ArrowLeft,
  BarChart3,
  Target,
  Activity,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
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

const blurTransition = {
  duration: 0.8,
  ease: [0.25, 0.46, 0.45, 0.94],
} as const;

/* ── Step 1: Modal mockup using real CustomStatModal components ── */

const noop = () => {};

function ModalMockup() {
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

      {/* Scrollable form — uses real FieldRow, ChipGroup, Input, Separator */}
      <div className="overflow-y-auto flex-1 px-6 py-5 custom-scrollbar">
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

function CardMockup() {
  return (
    <div className="max-w-sm mx-auto">
      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm shadow-md overflow-hidden">
        {/* Equity curve area */}
        <div className="h-28 w-full px-3 pt-3 relative">
          <svg
            viewBox="0 0 400 100"
            fill="none"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                id="eq-fill"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor="var(--tc-primary)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--tc-primary)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Fill area */}
            <path
              d="M0 80 Q50 75 80 60 Q120 40 160 45 Q200 50 240 30 Q280 15 320 20 Q360 25 400 10 L400 100 L0 100 Z"
              fill="url(#eq-fill)"
            />
            {/* Line */}
            <path
              d="M0 80 Q50 75 80 60 Q120 40 160 45 Q200 50 240 30 Q280 15 320 20 Q360 25 400 10"
              stroke="var(--tc-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
        </div>

        {/* Card info */}
        <div className="px-4 pt-3 pb-4">
          {/* Name + P&L badge */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-100">
              Long DAX Morning
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-800">
                +6.40%
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-end justify-between gap-4 mt-3">
            <div className="flex items-center gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  Win Rate
                </p>
                <p className="text-sm font-semibold text-slate-100">
                  62%
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-400">
                  Trades
                </p>
                <p className="text-sm font-semibold text-slate-100">14</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                Net P&L
              </p>
              <p className="text-sm font-semibold text-white">
                +$3,200.00
              </p>
            </div>
          </div>

          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-1 mt-3">
            {['Long', 'DAX', 'London', 'Win', 'Q1'].map((pill) => (
              <span
                key={pill}
                className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-700/60 text-slate-300"
              >
                {pill}
              </span>
            ))}
          </div>

          {/* Divider */}
          <div className="mt-3 h-px bg-slate-700/40" />

          {/* Actions */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/60 bg-slate-800/50 text-xs font-medium text-slate-300">
                <Pencil className="h-3 w-3" />
                Edit
              </span>
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white">
                <Trash2 className="h-3.5 w-3.5" />
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Eye className="h-3.5 w-3.5" />
              <span className="underline underline-offset-2">
                View Details
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 3: Detail dashboard mockup ── */

function MiniGauge({
  value,
  label,
  min,
  max,
  color,
}: {
  value: string;
  label: string;
  min: string;
  max: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center">
      {/* Semicircle gauge */}
      <div className="relative w-24 h-14 sm:w-28 sm:h-16">
        {/* Track */}
        <svg viewBox="0 0 120 70" className="w-full h-full">
          <path
            d="M 10 65 A 50 50 0 0 1 110 65"
            fill="none"
            stroke="rgba(100,116,139,0.2)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 10 65 A 50 50 0 0 1 110 65"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="157"
            strokeDashoffset="60"
          />
        </svg>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-lg sm:text-xl font-bold text-slate-100">
          {value}
        </span>
      </div>
      <div className="flex justify-between w-full px-1 mt-1">
        <span className="text-[10px] text-slate-500">{min}</span>
        <span className="text-[10px] text-slate-500">{max}</span>
      </div>
      <p className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">
        {label}
      </p>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-sm shadow-md overflow-hidden">
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-700/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg themed-header-icon-box">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                Long DAX Morning
              </h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {['Long', 'DAX', 'London', 'Win', 'Q1', 'Conf: 4', 'Executed'].map(
                  (pill) => (
                    <span
                      key={pill}
                      className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-700/60 text-slate-300"
                    >
                      {pill}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700/60 bg-slate-800/50 text-xs font-medium text-slate-300 self-start sm:self-auto">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Custom Stats
          </span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="px-5 sm:px-6 py-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Net P&L */}
          <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Net P&L
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xl font-bold text-slate-100">$3,200</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-400">
                  +6.40%
                </span>
              </div>
            </div>
            {/* Mini equity line */}
            <svg
              viewBox="0 0 200 40"
              fill="none"
              className="w-full h-8 mt-2"
              preserveAspectRatio="none"
            >
              <path
                d="M0 35 Q30 30 50 24 Q80 15 110 18 Q140 22 170 10 Q185 6 200 4"
                stroke="var(--tc-primary)"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>

          {/* Total Trades */}
          <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-4 flex flex-col items-center justify-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Total Trades
            </p>
            {/* Donut */}
            <div className="relative w-16 h-16 mt-2">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="rgba(239,68,68,0.3)"
                  strokeWidth="3.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="3.5"
                  strokeDasharray="88"
                  strokeDashoffset="33"
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-100">
                14
              </span>
            </div>
          </div>

          {/* Win Rate */}
          <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-4 flex flex-col items-center justify-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
              Win Rate
            </p>
            <MiniGauge
              value="62%"
              label=""
              min="0%"
              max="100%"
              color="#3b82f6"
            />
          </div>

          {/* Avg Drawdown */}
          <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-4 flex flex-col items-center justify-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">
              Avg Drawdown
            </p>
            <MiniGauge
              value="0.45%"
              label=""
              min="0%"
              max="20%"
              color="#8b5cf6"
            />
          </div>
        </div>

        {/* Secondary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {/* Avg Win / Avg Loss */}
          <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-4">
            <p className="text-xs font-semibold text-slate-200">
              Avg Win / Avg Loss
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Win size vs loss size
            </p>
            <p className="text-2xl font-bold text-slate-100 mt-3">
              3.20x{' '}
              <span className="text-xs font-normal text-slate-400">
                W/L Ratio
              </span>
            </p>
            <div className="flex justify-between mt-2 text-[11px]">
              <span className="text-emerald-400">$480 avg win</span>
              <span className="text-rose-400">$150 avg loss</span>
            </div>
          </div>

          {/* Expectancy */}
          <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-4 flex flex-col items-center">
            <p className="text-xs font-semibold text-slate-200 self-start">
              Expectancy
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 self-start">
              Expected return per trade
            </p>
            <MiniGauge
              value="+$228"
              label=""
              min="Neg"
              max="Pos"
              color="#3b82f6"
            />
          </div>

          {/* Recovery Factor */}
          <div className="rounded-xl border border-slate-700/40 bg-slate-800/20 p-4 flex flex-col items-center">
            <p className="text-xs font-semibold text-slate-200 self-start">
              Recovery Factor
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 self-start">
              Profit vs max drawdown
            </p>
            <MiniGauge
              value="4.8+"
              label=""
              min="0"
              max="5.0"
              color="#3b82f6"
            />
          </div>
        </div>

        {/* Trades section hint */}
        <div className="mt-4 pt-4 border-t border-slate-700/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">Trades</p>
              <p className="text-xs text-slate-400">
                14 trades matching these filters
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">Sort by:</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg border border-slate-700/50 bg-slate-800/40 text-xs text-slate-300">
                Date
              </span>
            </div>
          </div>
          {/* Skeleton trade rows */}
          <div className="mt-3 space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg bg-slate-800/20 border border-slate-700/30 px-3 py-2.5"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-700/40 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div
                    className="h-2.5 rounded-full bg-slate-700/50"
                    style={{ width: `${50 + i * 12}%` }}
                  />
                  <div
                    className="h-2 rounded-full bg-slate-700/30"
                    style={{ width: `${30 + i * 8}%` }}
                  />
                </div>
                <div className="h-2.5 w-16 rounded-full bg-slate-700/40 shrink-0" />
              </div>
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
                  'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 cursor-pointer',
                  activeStep === i
                    ? 'themed-header-icon-box shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
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
              transition={blurTransition}
            >
              {activeStep < 2 ? (
                /* Steps 1 & 2: two-column layout */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-start">
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
                  {/* Centered text above */}
                  <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 mb-4">
                      <span
                        className="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                        style={{
                          backgroundColor: 'color-mix(in oklch, var(--tc-primary) 20%, transparent)',
                          color: 'var(--tc-primary)',
                        }}
                      >
                        3
                      </span>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                        Step 3
                      </span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl font-semibold text-slate-100 tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-base text-muted-foreground leading-relaxed max-w-lg mx-auto">
                      {step.description}
                    </p>

                    {/* Feature pills */}
                    <div className="flex flex-wrap justify-center gap-4 mt-6">
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
                  <div className="mx-auto max-w-5xl">
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
