import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Logo from '@/components/shared/Logo';

export default function PublicShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="w-full border-b border-slate-200/70 dark:border-slate-800/70 bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-md">
        <div className="max-w-(--breakpoint-xl) mx-auto w-full flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-900 dark:text-slate-50 hover:opacity-90 transition-opacity"
            aria-label="AlphaStats home"
          >
            <Logo className="w-7 h-7" />
            <span className="text-sm font-semibold tracking-widest">AlphaStats</span>
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-normal tracking-normal">
              · Journal, analyse and improve your trading
            </span>
          </Link>
          <Link
            href="/"
            className="relative overflow-hidden inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white themed-btn-primary shadow-md hover:shadow-lg transition-all duration-300 group"
          >
            <span className="relative z-10">Try AlphaStats free</span>
            <ArrowRight className="relative z-10 h-3 w-3" />
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
          </Link>
        </div>
      </div>
      {children}
    </>
  );
}
