'use client';

interface TradeDirectionChipsProps {
  value: string | null | undefined;
  onChange: (value: 'Long' | 'Short') => void;
  className?: string;
}

const baseClass =
  'h-12 rounded-2xl border transition-all duration-200 text-sm font-semibold cursor-pointer';
const idleClass =
  'border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 hover:border-slate-300/80 dark:hover:border-slate-600/80';

export function TradeDirectionChips({ value, onChange, className }: TradeDirectionChipsProps) {
  return (
    <div className={className ?? 'grid grid-cols-2 gap-3'}>
      <button
        type="button"
        onClick={() => onChange('Long')}
        className={`${baseClass} ${
          value === 'Long'
            ? 'border-emerald-400/70 bg-emerald-500/20 text-slate-50 ring-2 ring-emerald-400/40'
            : idleClass
        }`}
        aria-pressed={value === 'Long'}
      >
        <span className="inline-flex items-center gap-2">
          <span className="text-emerald-500 dark:text-emerald-400 text-xs">↑</span>
          <span>Long</span>
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChange('Short')}
        className={`${baseClass} ${
          value === 'Short'
            ? 'border-rose-400/70 bg-rose-500/25 text-slate-50 ring-2 ring-rose-400/40'
            : idleClass
        }`}
        aria-pressed={value === 'Short'}
      >
        <span className="inline-flex items-center gap-2">
          <span className="text-rose-500 dark:text-rose-400 text-xs">↓</span>
          <span>Short</span>
        </span>
      </button>
    </div>
  );
}

