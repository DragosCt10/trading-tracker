'use client';

import { useState } from 'react';
import { AlertCircle, LayoutGrid, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MarketCombobox } from '@/components/MarketCombobox';
import { CommonCombobox } from '@/components/CommonCombobox';
import { TIME_INTERVALS } from '@/constants/analytics';
import { cn } from '@/lib/utils';
import type { ExtraCardKey } from '@/constants/extraCards';
import type { CustomStatConfig, CustomStatFilter } from '@/types/customStats';

const MSS_OPTIONS = ['Normal', 'Aggressive', 'Wick', 'Internal'];
const SESSION_OPTIONS = ['Sydney', 'Tokyo', 'London', 'New York'];
const EVALUATION_OPTIONS = ['A+', 'A', 'B', 'C'];
const TREND_OPTIONS = ['Trend-following', 'Counter-trend', 'Consolidation'];
const FVG_SIZE_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

const INPUT_CLASS =
  'h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300';

const LABEL_CLASS = 'block text-sm font-semibold text-slate-700 dark:text-slate-300';

// ─── Chip toggle group ──────────────────────────────────────────────────────

interface ChipGroupProps {
  options: { label: string; value: string | boolean | number | undefined }[];
  value: string | boolean | number | undefined;
  onChange: (value: string | boolean | number | undefined) => void;
}

function ChipGroup({ options, value, onChange }: ChipGroupProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(isActive ? undefined : opt.value)}
            className={cn(
              'min-w-[2.25rem] px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer',
              isActive
                ? 'themed-header-icon-box shadow-sm'
                : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Select with "Any" option ───────────────────────────────────────────────

function SelectAny({
  value,
  onValueChange,
  placeholder,
  options,
}: {
  value: string | undefined;
  onValueChange: (v: string | undefined) => void;
  placeholder: string;
  options: { label: string; value: string }[];
}) {
  return (
    <Select
      value={value ?? '__any__'}
      onValueChange={(v) => onValueChange(v === '__any__' ? undefined : v)}
    >
      <SelectTrigger className={INPUT_CLASS}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__any__">Any</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Form section row ───────────────────────────────────────────────────────

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className={LABEL_CLASS}>{label}</Label>
      {children}
    </div>
  );
}

// ─── Inner form (keyed so state resets on editing change) ──────────────────

const EMPTY_FILTER: CustomStatFilter = {};

interface ModalFormContentProps {
  editing: CustomStatConfig | null;
  extraCards: ExtraCardKey[];
  setupOptions: string[];
  liquidityOptions: string[];
  tagOptions: string[];
  onSave: (config: CustomStatConfig) => void;
  onClose: () => void;
}

function ModalFormContent({ editing, extraCards, setupOptions, liquidityOptions, tagOptions, onSave, onClose }: ModalFormContentProps) {
  const [name, setName] = useState(editing?.name ?? '');
  const [filters, setFilters] = useState<CustomStatFilter>(editing?.filters ?? EMPTY_FILTER);
  const [nameError, setNameError] = useState('');
  const [filtersError, setFiltersError] = useState('');
  const error = nameError || filtersError;

  const hasCard = (key: ExtraCardKey) => extraCards.includes(key);

  const setFilter = <K extends keyof CustomStatFilter>(key: K, value: CustomStatFilter[K]) => {
    setFiltersError('');
    setFilters((prev) => {
      if (value === undefined) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('Name is required.');
      return;
    }
    const hasAtLeastOneFilter = Object.values(filters).some(
      (value) => value !== undefined && value !== null && value !== ''
    );
    if (!editing && !hasAtLeastOneFilter) {
      setFiltersError('Select at least one filter to create a custom stat.');
      return;
    }
    onSave({
      id: editing?.id ?? crypto.randomUUID(),
      name: name.trim(),
      filters,
      created_at: editing?.created_at ?? new Date().toISOString(),
    });
  };

  return (
    <>
      {/* Fixed header */}
      <div className="relative px-6 pt-5 pb-4 border-b border-slate-200/50 dark:border-slate-700/50 flex-shrink-0">
        <AlertDialogHeader className="space-y-1.5">
          <div className="flex items-center justify-between">
            <AlertDialogTitle className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              <div className="p-2 rounded-lg themed-header-icon-box">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <span>{editing ? 'Edit Custom Stat' : 'Create Custom Stat'}</span>
            </AlertDialogTitle>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-sm ring-offset-background transition-all hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none h-8 w-8 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
          <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-400">
            Define a filter combination. You must select at least one filter to create a custom stat.
          </AlertDialogDescription>
        </AlertDialogHeader>
      </div>

      {/* Scrollable content */}
      <div className="relative overflow-y-auto flex-1 px-6 py-5">
        <div className="space-y-5">

          {/* Name */}
          <FieldRow label="Name *">
            <Input
              value={name}
              onChange={(e) => { setName(e.target.value); setNameError(''); }}
              placeholder="e.g. Long DAX Morning"
              className={INPUT_CLASS}
            />
          </FieldRow>

          <Separator />

          {/* ── Always-available filters ── */}
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filter Criteria</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Direction */}
            <FieldRow label="Direction">
              <ChipGroup
                options={[
                  { label: 'Long', value: 'Long' },
                  { label: 'Short', value: 'Short' },
                ]}
                value={filters.direction}
                onChange={(v) => setFilter('direction', v as CustomStatFilter['direction'])}
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
                value={filters.trade_outcome}
                onChange={(v) => setFilter('trade_outcome', v as CustomStatFilter['trade_outcome'])}
              />
            </FieldRow>
          </div>

          {/* Market */}
          <FieldRow label="Market">
            <MarketCombobox
              value={filters.market ?? ''}
              onChange={(v) => setFilter('market', v || undefined)}
              className={INPUT_CLASS}
            />
          </FieldRow>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Trade Time */}
            <FieldRow label="Trade Time (Interval)">
              <SelectAny
                value={filters.trade_time}
                onValueChange={(v) => setFilter('trade_time', v)}
                placeholder="Any interval"
                options={TIME_INTERVALS.map((i) => ({ label: i.label, value: i.start }))}
              />
            </FieldRow>

            {/* Day of Week */}
            <FieldRow label="Day of Week">
              <SelectAny
                value={filters.day_of_week}
                onValueChange={(v) => setFilter('day_of_week', v)}
                placeholder="Any day"
                options={DAYS_OF_WEEK.map((d) => ({ label: d, value: d }))}
              />
            </FieldRow>
          </div>

          {/* Quarter */}
          <FieldRow label="Quarter">
            <ChipGroup
              options={QUARTERS.map((q) => ({ label: q, value: q }))}
              value={filters.quarter}
              onChange={(v) => setFilter('quarter', v as string | undefined)}
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
                value={filters.executed}
                onChange={(v) => setFilter('executed', v as boolean | undefined)}
              />
            </FieldRow>

            <FieldRow label="News Related">
              <ChipGroup
                options={[
                  { label: 'Yes', value: true },
                  { label: 'No', value: false },
                ]}
                value={filters.news_related}
                onChange={(v) => setFilter('news_related', v as boolean | undefined)}
              />
            </FieldRow>

            <FieldRow label="Re-entry">
              <ChipGroup
                options={[
                  { label: 'Yes', value: true },
                  { label: 'No', value: false },
                ]}
                value={filters.reentry}
                onChange={(v) => setFilter('reentry', v as boolean | undefined)}
              />
            </FieldRow>

            <FieldRow label="Partials Taken">
              <ChipGroup
                options={[
                  { label: 'Yes', value: true },
                  { label: 'No', value: false },
                ]}
                value={filters.partials_taken}
                onChange={(v) => setFilter('partials_taken', v as boolean | undefined)}
              />
            </FieldRow>
          </div>

          <Separator />

          {/* Confidence & Mind State */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800 shadow-sm">
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Confidence at Entry</p>
              <ChipGroup
                options={[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))}
                value={filters.confidence_at_entry}
                onChange={(v) => setFilter('confidence_at_entry', v as number | undefined)}
              />
              {filters.confidence_at_entry != null && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Selected: {[null, 'Very low', 'Low', 'Neutral', 'Good', 'Very confident'][filters.confidence_at_entry]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Mind State at Entry</p>
              <ChipGroup
                options={[1, 2, 3, 4, 5].map((n) => ({ label: String(n), value: n }))}
                value={filters.mind_state_at_entry}
                onChange={(v) => setFilter('mind_state_at_entry', v as number | undefined)}
              />
              {filters.mind_state_at_entry != null && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Selected: {['Very poor', 'Poor', 'Neutral', 'Good', 'Very good'][filters.mind_state_at_entry - 1]}
                </p>
              )}
            </div>
          </div>

          {/* ── Conditional filters (based on extra_cards or existing filter values) ── */}
          {(hasCard('setup_stats') || hasCard('liquidity_stats') || hasCard('mss_stats') ||
            hasCard('session_stats') || hasCard('evaluation_stats') || hasCard('trend_stats') ||
            hasCard('local_hl_stats') || hasCard('launch_hour') || hasCard('fvg_size') ||
            filters.setup_type !== undefined || filters.liquidity !== undefined ||
            filters.mss !== undefined || filters.session !== undefined ||
            filters.evaluation !== undefined || filters.trend !== undefined ||
            filters.local_high_low !== undefined || filters.launch_hour !== undefined ||
            filters.fvg_size !== undefined) && (
            <>
              <Separator />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Strategy-specific Filters</p>

              {(hasCard('setup_stats') || filters.setup_type !== undefined) && (
                <FieldRow label="Pattern / Setup">
                  <CommonCombobox
                    value={filters.setup_type ?? ''}
                    onChange={(v) => setFilter('setup_type', v || undefined)}
                    placeholder="Any setup"
                    options={setupOptions}
                    customValueLabel="pattern / setup"
                    dropdownClassName="w-full"
                  />
                </FieldRow>
              )}

              {(hasCard('liquidity_stats') || filters.liquidity !== undefined) && (
                <FieldRow label="Liquidity / Conditions">
                  <CommonCombobox
                    value={filters.liquidity ?? ''}
                    onChange={(v) => setFilter('liquidity', v || undefined)}
                    placeholder="Any condition"
                    options={liquidityOptions}
                    defaultSuggestions={liquidityOptions}
                    customValueLabel="conditions / liquidity"
                    dropdownClassName="w-full"
                  />
                </FieldRow>
              )}

              {(hasCard('mss_stats') || filters.mss !== undefined) && (
                <FieldRow label="MSS">
                  <SelectAny
                    value={filters.mss}
                    onValueChange={(v) => setFilter('mss', v)}
                    placeholder="Any MSS"
                    options={MSS_OPTIONS.map((o) => ({ label: o, value: o }))}
                  />
                </FieldRow>
              )}

              {(hasCard('session_stats') || filters.session !== undefined) && (
                <FieldRow label="Session">
                  <ChipGroup
                    options={SESSION_OPTIONS.map((s) => ({ label: s, value: s }))}
                    value={filters.session}
                    onChange={(v) => setFilter('session', v as string | undefined)}
                  />
                </FieldRow>
              )}

              {(hasCard('evaluation_stats') || filters.evaluation !== undefined) && (
                <FieldRow label="Evaluation">
                  <ChipGroup
                    options={EVALUATION_OPTIONS.map((o) => ({ label: o, value: o }))}
                    value={filters.evaluation}
                    onChange={(v) => setFilter('evaluation', v as string | undefined)}
                  />
                </FieldRow>
              )}

              {(hasCard('trend_stats') || filters.trend !== undefined) && (
                <FieldRow label="Trend">
                  <SelectAny
                    value={filters.trend}
                    onValueChange={(v) => setFilter('trend', v)}
                    placeholder="Any trend"
                    options={TREND_OPTIONS.map((o) => ({ label: o, value: o }))}
                  />
                </FieldRow>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {(hasCard('local_hl_stats') || filters.local_high_low !== undefined) && (
                  <FieldRow label="Local H/L Taken">
                    <ChipGroup
                      options={[
                        { label: 'Yes', value: true },
                        { label: 'No', value: false },
                      ]}
                      value={filters.local_high_low}
                      onChange={(v) => setFilter('local_high_low', v as boolean | undefined)}
                    />
                  </FieldRow>
                )}

                {(hasCard('launch_hour') || filters.launch_hour !== undefined) && (
                  <FieldRow label="Launch Hour">
                    <ChipGroup
                      options={[
                        { label: 'Yes', value: true },
                        { label: 'No', value: false },
                      ]}
                      value={filters.launch_hour}
                      onChange={(v) => setFilter('launch_hour', v as boolean | undefined)}
                    />
                  </FieldRow>
                )}
              </div>

              {(hasCard('fvg_size') || filters.fvg_size !== undefined) && (
                <FieldRow label="FVG Size">
                  <ChipGroup
                    options={FVG_SIZE_OPTIONS.map((n) => ({ label: String(n), value: n }))}
                    value={filters.fvg_size}
                    onChange={(v) => setFilter('fvg_size', v as number | undefined)}
                  />
                </FieldRow>
              )}

              {(tagOptions.length > 0 || (filters.tags?.length ?? 0) > 0) && (
                <FieldRow label="Tags">
                  <div className="flex flex-wrap gap-2">
                    {tagOptions.sort().map((tag) => {
                      const isActive = filters.tags?.includes(tag) ?? false;
                      const label = tag.length > 20 ? tag.slice(0, 19) + '…' : tag;
                      return (
                        <button
                          key={tag}
                          type="button"
                          title={tag}
                          onClick={() => {
                            const current = filters.tags ?? [];
                            const next = isActive
                              ? current.filter((t) => t !== tag)
                              : [...current, tag];
                            setFilter('tags', next.length > 0 ? next : undefined);
                          }}
                          className={cn(
                            'px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 cursor-pointer',
                            isActive
                              ? 'themed-header-icon-box shadow-sm'
                              : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {(filters.tags?.length ?? 0) > 0 && (
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">Matches trades with any selected tag</p>
                  )}
                </FieldRow>
              )}
            </>
          )}

          {/* Action buttons (same pattern as NewTradeModal — inside scrollable area) */}
          {error && (
            <Alert variant="destructive" className="mb-2 bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 backdrop-blur-sm">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end gap-3 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-slate-200/80 bg-slate-100/60 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 hover:border-slate-300/80 dark:border-slate-700/80 dark:bg-slate-900/40 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50 dark:hover:border-slate-600/80 px-4 py-2 text-sm font-medium transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 [&_svg]:text-white"
            >
              <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                {editing ? 'Save Changes' : 'Create'}
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Public component ──────────────────────────────────────────────────────

interface CustomStatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: CustomStatConfig) => void;
  editing: CustomStatConfig | null;
  extraCards: ExtraCardKey[];
  setupOptions?: string[];
  liquidityOptions?: string[];
  tagOptions?: string[];
}

export function CustomStatModal({
  isOpen,
  onClose,
  onSave,
  editing,
  extraCards,
  setupOptions = [],
  liquidityOptions = [],
  tagOptions = [],
}: CustomStatModalProps) {
  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient text-slate-900 dark:text-slate-50 backdrop-blur-xl shadow-xl shadow-slate-900/20 dark:shadow-black/60 !rounded-2xl p-0 flex flex-col overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          <div className="absolute -top-40 -left-32 w-[420px] h-[420px] orb-bg-1 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-32 w-[420px] h-[420px] orb-bg-2 rounded-full blur-3xl" />
        </div>

        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.015] dark:opacity-[0.02] mix-blend-overlay pointer-events-none rounded-2xl"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
          }}
        />

        {/* Top accent line */}
        <div className="absolute -top-px left-0 right-0 h-0.5 themed-accent-line rounded-t-2xl" />

        <ModalFormContent
          key={editing?.id ?? 'new'}
          editing={editing}
          extraCards={extraCards}
          setupOptions={setupOptions}
          liquidityOptions={liquidityOptions}
          tagOptions={tagOptions}
          onSave={onSave}
          onClose={onClose}
        />
      </AlertDialogContent>
    </AlertDialog>
  );
}
