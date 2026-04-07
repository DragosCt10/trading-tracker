'use client';

import { useEffect, useRef } from 'react';
import { LayoutGrid } from 'lucide-react';
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

const noop = () => {};

export function ModalMockup() {
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
      {/* Modal header -- mirrors CustomStatModal header */}
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

      {/* Scrollable form -- auto-scrolls, pauses on hover */}
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
              aria-label="Name"
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
              aria-label="Market"
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
              aria-label="Pattern / Setup"
              className={INPUT_CLASS}
            />
          </FieldRow>

          {/* Liquidity / Conditions */}
          <FieldRow label="Liquidity / Conditions">
            <Input
              value=""
              readOnly
              placeholder="Any condition"
              aria-label="Liquidity / Conditions"
              className={INPUT_CLASS}
            />
          </FieldRow>

          {/* MSS */}
          <FieldRow label="MSS">
            <Select value="__any__" onValueChange={noop}>
              <SelectTrigger className={INPUT_CLASS} aria-label="MSS">
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
              <SelectTrigger className={INPUT_CLASS} aria-label="Trend">
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

          {/* Action buttons -- mirrors CustomStatModal */}
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
