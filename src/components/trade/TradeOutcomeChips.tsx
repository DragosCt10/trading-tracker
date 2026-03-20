'use client';

interface TradeOutcomeChipsProps {
  value: string | null | undefined;
  onChange: (value: 'Win' | 'Lose' | 'BE') => void;
  className?: string;
}

const baseClass =
  'h-12 rounded-2xl border transition-all duration-200 text-sm font-semibold cursor-pointer';
const idleClass =
  'border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-800 dark:text-slate-200 hover:border-slate-300/80 dark:hover:border-slate-600/80';

export function TradeOutcomeChips({ value, onChange, className }: TradeOutcomeChipsProps) {
  return (
    <div className={className ?? 'grid grid-cols-3 gap-3'}>
      <button
        type="button"
        onClick={() => onChange('Win')}
        className={`${baseClass} ${
          value === 'Win'
            ? 'border-emerald-400/70 bg-emerald-500/20 text-slate-50 ring-2 ring-emerald-400/40'
            : idleClass
        }`}
        aria-pressed={value === 'Win'}
      >
        Win
      </button>
      <button
        type="button"
        onClick={() => onChange('Lose')}
        className={`${baseClass} ${
          value === 'Lose'
            ? 'border-rose-400/70 bg-rose-500/25 text-slate-50 ring-2 ring-rose-400/40'
            : idleClass
        }`}
        aria-pressed={value === 'Lose'}
      >
        Lose
      </button>
      <button
        type="button"
        onClick={() => onChange('BE')}
        className={`${baseClass} ${
          value === 'BE'
            ? 'border-orange-400/70 bg-orange-500/20 text-slate-50 ring-2 ring-orange-400/40'
            : idleClass
        }`}
        aria-pressed={value === 'BE'}
      >
        BE
      </button>
    </div>
  );
}

