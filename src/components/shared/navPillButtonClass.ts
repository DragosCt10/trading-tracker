import { cn } from '@/lib/utils';

/** Same pill style as main app nav links (`Navbar` Stats Center, Insight Vault, etc.). */
export function navPillButtonClass(active: boolean) {
  return cn(
    'gap-2 rounded-xl border transition-all duration-200',
    'bg-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 hover:border-slate-300/70',
    'dark:text-slate-200 dark:hover:text-slate-50 dark:hover:bg-slate-800/70 dark:hover:border-slate-700/70',
    active && 'themed-nav-active'
  );
}
