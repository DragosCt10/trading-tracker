'use client';

import { ReactNode, useState, useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Plus, TrendingUp, BarChart3, NotebookPen, LayoutGrid, ChevronRight, ChevronLeft, Bot, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { NewTradeModal } from '@/components/dynamicComponents';
import { BECalcProvider } from '@/contexts/BECalcContext';

interface InsideStrategyLayoutProps {
  children: ReactNode;
}

export default function InsideStrategyLayout({ children }: InsideStrategyLayoutProps) {
  const pathname = usePathname();
  const [newTradeModalOpen, setNewTradeModalOpen] = useState(false);
  const [isNavHidden, setIsNavHidden] = useState(() => {
    if (typeof window === 'undefined') return true;
    // Mobile: always start hidden (ephemeral). Desktop: restore from localStorage.
    if (window.innerWidth < 1024) return true;
    return localStorage.getItem('sidebar-nav-hidden') === 'true';
  });

  const toggleNav = () => {
    setIsNavHidden(prev => {
      const next = !prev;
      // Only persist on desktop — mobile state is ephemeral
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        localStorage.setItem('sidebar-nav-hidden', String(next));
      }
      return next;
    });
  };

  // Listen for show-sidenav events dispatched from the Navbar button
  useEffect(() => {
    const handler = () => {
      setIsNavHidden(false);
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        localStorage.setItem('sidebar-nav-hidden', 'false');
      }
    };
    window.addEventListener('strategy-sidenav:show', handler);
    return () => window.removeEventListener('strategy-sidenav:show', handler);
  }, []);

  // Listen for open-new-trade events dispatched from ActionBar
  useEffect(() => {
    const handler = () => setNewTradeModalOpen(true);
    window.addEventListener('new-trade-modal:open', handler);
    return () => window.removeEventListener('new-trade-modal:open', handler);
  }, []);

  // Auto-close nav on mobile when the route changes (safety net; link onClick closes synchronously)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsNavHidden(true);
    }
  }, [pathname]);

  // Auto-close nav when viewport shrinks below the desktop breakpoint
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023.98px)');
    const handle = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) setIsNavHidden(true);
    };
    handle(mql);
    mql.addEventListener('change', handle);
    return () => mql.removeEventListener('change', handle);
  }, []);

  // Extract strategy slug from routes: /strategy/[strategy] or /strategy/[strategy]/my-trades etc.
  const currentStrategySlug = useMemo(() => {
    const match = pathname.match(/^\/(?:analytics|strategy)\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [pathname]);

  const analyticsUrl = useMemo(() => {
    return currentStrategySlug ? `/strategy/${encodeURIComponent(currentStrategySlug)}` : '/stats';
  }, [currentStrategySlug]);

  const myTradesUrl = useMemo(() => {
    return currentStrategySlug ? `/strategy/${encodeURIComponent(currentStrategySlug)}/my-trades` : '/stats';
  }, [currentStrategySlug]);

  const dailyJournalUrl = useMemo(() => {
    return currentStrategySlug ? `/strategy/${encodeURIComponent(currentStrategySlug)}/daily-journal` : '/stats';
  }, [currentStrategySlug]);

  const customStatsUrl = useMemo(() => {
    return currentStrategySlug ? `/strategy/${encodeURIComponent(currentStrategySlug)}/custom-stats` : '/stats';
  }, [currentStrategySlug]);

  const aiVisionUrl = useMemo(() => {
    return currentStrategySlug ? `/strategy/${encodeURIComponent(currentStrategySlug)}/ai-vision` : '/stats';
  }, [currentStrategySlug]);

  const isActive = (path: string) => {
    if (path === '/my-trades') {
      return pathname.includes('/my-trades') && (pathname.startsWith('/strategy') || pathname.startsWith('/analytics'));
    }
    if (path === '/analytics') {
      return pathname.startsWith('/strategy') && !pathname.includes('/my-trades') && !pathname.includes('/daily-journal') && !pathname.includes('/custom-stats') && !pathname.includes('/ai-vision');
    }
    if (path === '/daily-journal') {
      return pathname.includes('/daily-journal') && (pathname.startsWith('/strategy') || pathname.startsWith('/analytics'));
    }
    if (path === '/custom-stats') {
      return pathname.includes('/custom-stats') && (pathname.startsWith('/strategy') || pathname.startsWith('/analytics'));
    }
    if (path === '/ai-vision') {
      return pathname.includes('/ai-vision') && (pathname.startsWith('/strategy') || pathname.startsWith('/analytics'));
    }
    return pathname === path;
  };

  const navButtonClass = (active: boolean) =>
    cn(
      'transition-all duration-300 relative overflow-hidden rounded-xl border w-full h-auto min-h-[64px] !p-0',
      active
        ? 'group/navactive cursor-pointer themed-btn-primary text-white font-semibold border-0 hover:text-white [&_svg]:text-white [&_span]:text-white'
        : 'bg-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 hover:border-slate-300/70 dark:text-slate-200 dark:hover:text-slate-50 dark:hover:bg-slate-800/70 dark:hover:border-slate-700/70'
    );

  return (
    <BECalcProvider>
      {children}

      {/* Mobile backdrop — tap outside nav to close */}
      {!isNavHidden && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={toggleNav}
          aria-hidden="true"
        />
      )}

      {/* Mobile floating trigger — visible on small screens when nav is hidden */}
      {isNavHidden && (
        <button
          onClick={toggleNav}
          aria-label="Show navigation"
          className="fixed bottom-6 left-4 z-40 flex lg:hidden items-center justify-center h-10 w-10 rounded-xl bg-slate-800/90 dark:bg-slate-700/80 backdrop-blur-xl border border-slate-700/50 dark:border-slate-600/50 shadow-lg shadow-black/30 cursor-pointer"
        >
          <PanelLeft className="h-5 w-5 text-white" />
        </button>
      )}

      {/* Desktop reveal strip — shown when nav is hidden */}
      {isNavHidden && (
        <button
          onClick={toggleNav}
          aria-label="Show navigation"
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 hidden lg:flex items-center justify-center h-24 w-7 rounded-r-xl overflow-hidden bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl border border-l-0 border-slate-200/70 dark:border-slate-700/50 cursor-pointer group/reveal"
        >
          <div className="themed-nav-overlay themed-nav-overlay--vertical pointer-events-none absolute inset-0" />
          <ChevronRight className="relative z-10 h-4 w-4 text-slate-400 dark:text-slate-500 transition-transform duration-300 ease-in-out group-hover/reveal:translate-x-0.5 group-hover/reveal:scale-110 group-hover/reveal:text-slate-600 dark:group-hover/reveal:text-slate-300" />
        </button>
      )}

      {/* Floating Left Bar */}
      <div className={cn(
        'fixed left-0 top-1/2 -translate-y-1/2 z-40 block group/nav',
        'transition-transform duration-300 ease-in-out',
        isNavHidden && '-translate-x-full'
      )}>
        {/* Card: always expanded on mobile, icon-only collapsed + hover-expand on desktop */}
        <div className="relative group/card rounded-r-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 overflow-hidden transition-all duration-300 w-52 lg:w-23 lg:hover:w-52">
          <div className="themed-nav-overlay themed-nav-overlay--vertical pointer-events-none absolute inset-0" />

          {/* Hide chevron — desktop only, inside card, right edge, vertically centered */}
          <button
            onClick={toggleNav}
            aria-label="Hide navigation"
            className="group/hide absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden lg:flex opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 h-10 w-5 items-center justify-center rounded-l-lg text-slate-400 dark:text-slate-500 bg-slate-100/80 dark:bg-slate-800/60 border border-r-0 border-slate-200/70 dark:border-slate-700/50 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 transition-transform duration-300 ease-in-out group-hover/hide:-translate-x-0.5 group-hover/hide:scale-110 group-hover/hide:text-slate-600 dark:group-hover/hide:text-slate-300" />
          </button>

          <div
            className="relative flex flex-col gap-2 p-3"
            onClick={(e) => {
              if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                const target = e.target as HTMLElement;
                if (target.closest('a')) setIsNavHidden(true);
              }
            }}
          >
            <Button variant="ghost" asChild size="sm" className={navButtonClass(isActive('/analytics'))}>
              <Link href={analyticsUrl} className="block w-full h-full relative min-h-[40px]">
                <BarChart3 className="!h-6 !w-6 flex-shrink-0 absolute left-5 top-1/2 -translate-y-1/2" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-100 max-w-[140px] lg:opacity-0 lg:max-w-0 overflow-hidden lg:group-hover/card:max-w-[140px] lg:group-hover/card:opacity-100 transition-all duration-300">Analytics</span>
                {isActive('/analytics') && <div className="absolute inset-0 -translate-x-full group-hover/navactive:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />}
              </Link>
            </Button>
            <Button variant="ghost" asChild size="sm" className={navButtonClass(isActive('/daily-journal'))}>
              <Link href={dailyJournalUrl} className="block w-full h-full relative min-h-[40px]">
                <NotebookPen className="!h-6 !w-6 flex-shrink-0 absolute left-5 top-1/2 -translate-y-1/2" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-100 max-w-[140px] lg:opacity-0 lg:max-w-0 overflow-hidden lg:group-hover/card:max-w-[140px] lg:group-hover/card:opacity-100 transition-all duration-300">Daily Journal</span>
                {isActive('/daily-journal') && <div className="absolute inset-0 -translate-x-full group-hover/navactive:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />}
              </Link>
            </Button>
            <Button variant="ghost" asChild size="sm" className={navButtonClass(isActive('/custom-stats'))}>
              <Link href={customStatsUrl} className="block w-full h-full relative min-h-[40px]">
                <LayoutGrid className="!h-6 !w-6 flex-shrink-0 absolute left-5 top-1/2 -translate-y-1/2" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-100 max-w-[140px] lg:opacity-0 lg:max-w-0 overflow-hidden lg:group-hover/card:max-w-[140px] lg:group-hover/card:opacity-100 transition-all duration-300">Custom Stats</span>
                {isActive('/custom-stats') && <div className="absolute inset-0 -translate-x-full group-hover/navactive:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />}
              </Link>
            </Button>
            <Button variant="ghost" asChild size="sm" className={navButtonClass(isActive('/ai-vision'))}>
              <Link href={aiVisionUrl} className="block w-full h-full relative min-h-[40px]">
                <Bot className="!h-6 !w-6 flex-shrink-0 absolute left-5 top-1/2 -translate-y-1/2" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-100 max-w-[140px] lg:opacity-0 lg:max-w-0 overflow-hidden lg:group-hover/card:max-w-[140px] lg:group-hover/card:opacity-100 transition-all duration-300">AI Vision</span>
                {isActive('/ai-vision') && <div className="absolute inset-0 -translate-x-full group-hover/navactive:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />}
              </Link>
            </Button>
            <Button variant="ghost" asChild size="sm" className={navButtonClass(isActive('/my-trades'))}>
              <Link href={myTradesUrl} className="block w-full h-full relative min-h-[40px]">
                <TrendingUp className="!h-6 !w-6 flex-shrink-0 absolute left-5 top-1/2 -translate-y-1/2" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-100 max-w-[140px] lg:opacity-0 lg:max-w-0 overflow-hidden lg:group-hover/card:max-w-[140px] lg:group-hover/card:opacity-100 transition-all duration-300">My Trades</span>
                {isActive('/my-trades') && <div className="absolute inset-0 -translate-x-full group-hover/navactive:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />}
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'lg:hidden themed-btn-primary transition-all duration-300 relative overflow-hidden rounded-xl border-0 w-full h-auto min-h-[64px] !p-0 cursor-pointer text-white font-semibold group/newtrade [&_svg]:text-white [&_span]:text-white'
              )}
              onClick={() => setNewTradeModalOpen(true)}
            >
              <div className="block w-full h-full relative min-h-[40px]">
                <Plus className="!h-6 !w-6 flex-shrink-0 absolute left-5 top-1/2 -translate-y-1/2" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap">New Trade</span>
                <div className="absolute inset-0 -translate-x-full group-hover/newtrade:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
              </div>
            </Button>
          </div>
        </div>
      </div>

      {/* New Trade Modal */}
      <NewTradeModal
        isOpen={newTradeModalOpen}
        onClose={() => setNewTradeModalOpen(false)}
        onTradeCreated={() => {
          setNewTradeModalOpen(false);
        }}
      />
    </BECalcProvider>
  );
}
