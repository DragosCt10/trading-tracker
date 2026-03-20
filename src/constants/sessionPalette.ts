export const SESSION_PALETTE: Record<string, { fill: string; textClass: string; dotClass: string; chipClass: string }> = {
  Sydney:     { fill: '#f59e0b', textClass: 'text-amber-600 dark:text-amber-400',   dotClass: 'bg-amber-500',   chipClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50' },
  Tokyo:      { fill: '#0ea5e9', textClass: 'text-sky-600 dark:text-sky-400',       dotClass: 'bg-sky-500',     chipClass: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/50'         },
  London:     { fill: '#8b5cf6', textClass: 'text-violet-600 dark:text-violet-400', dotClass: 'bg-violet-500',  chipClass: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/50' },
  'New York': { fill: '#10b981', textClass: 'text-emerald-600 dark:text-emerald-400', dotClass: 'bg-emerald-500', chipClass: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50' },
};

export const SESSION_FALLBACK_FILLS = ['#f59e0b', '#0ea5e9', '#8b5cf6', '#10b981', '#f43f5e', '#64748b'];
