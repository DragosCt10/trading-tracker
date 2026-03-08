'use client';

interface DailyJournalClientProps {
  strategyId: string;
  strategyName: string;
}

export default function DailyJournalClient({ strategyId: _strategyId, strategyName }: DailyJournalClientProps) {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
          Daily Journal
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Log daily notes and reflections for {strategyName}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 p-8 text-center text-slate-500 dark:text-slate-400">
        <p>Daily journal content will go here. Strategy: {strategyName}</p>
      </div>
    </div>
  );
}
