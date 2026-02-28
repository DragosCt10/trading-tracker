'use client';

import { ReactNode, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { FileText, PlusCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Dynamically import NewTradeModal with SSR disabled to prevent hydration errors
const NewTradeModal = dynamic(() => import('@/components/NewTradeModal'), {
  ssr: false,
});

interface InsideStrategyLayoutProps {
  children: ReactNode;
}

export default function InsideStrategyLayout({ children }: InsideStrategyLayoutProps) {
  const pathname = usePathname();
  const [newTradeModalOpen, setNewTradeModalOpen] = useState(false);

  // Extract strategy slug from routes: /strategy/[strategy] or /strategy/[strategy]/manage-trades or /strategy/[strategy]/my-trades
  const currentStrategySlug = useMemo(() => {
    const match = pathname.match(/^\/(?:analytics|strategy)\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }, [pathname]);

  // Get URLs with the strategy slug
  const analyticsUrl = useMemo(() => {
    return currentStrategySlug ? `/strategy/${encodeURIComponent(currentStrategySlug)}` : '/strategies';
  }, [currentStrategySlug]);

  const manageTradesUrl = useMemo(() => {
    return currentStrategySlug ? `/strategy/${encodeURIComponent(currentStrategySlug)}/manage-trades` : '/strategies';
  }, [currentStrategySlug]);

  const myTradesUrl = useMemo(() => {
    return currentStrategySlug ? `/strategy/${encodeURIComponent(currentStrategySlug)}/my-trades` : '/strategies';
  }, [currentStrategySlug]);

  const isActive = (path: string) => {
    if (path === '/manage-trades') {
      return pathname.includes('/manage-trades') && (pathname.startsWith('/strategy') || pathname.startsWith('/analytics'));
    }
    if (path === '/my-trades') {
      return pathname.includes('/my-trades') && (pathname.startsWith('/strategy') || pathname.startsWith('/analytics'));
    }
    if (path === '/analytics') {
      return pathname.startsWith('/strategy') && !pathname.includes('/manage-trades') && !pathname.includes('/my-trades');
    }
    return pathname === path;
  };

  const navButtonClass = (active: boolean) =>
    cn(
      'gap-2 rounded-xl border transition-all duration-200',
      'bg-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 hover:border-slate-300/70',
      'dark:text-slate-200 dark:hover:text-slate-50 dark:hover:bg-slate-800/70 dark:hover:border-slate-700/70',
      active && 'themed-nav-active'
    );

  return (
    <>
      {children}

      {/* Floating Left Bar - Centered Middle */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden lg:block group">
        <div className="relative rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 overflow-hidden transition-all duration-300 w-20 hover:w-52">
          <div className="themed-nav-overlay themed-nav-overlay--vertical pointer-events-none absolute inset-0" />
          <div className="relative flex flex-col gap-2 p-3">
            <Button
              variant="ghost"
              asChild
              size="sm"
              className={cn(navButtonClass(isActive('/analytics')), 'w-full h-auto min-h-[64px] !p-0')}
            >
              <Link href={analyticsUrl} className="block w-full h-full relative min-h-[40px]">
                <BarChart3 className="!h-6 !w-6 flex-shrink-0 absolute left-4 top-1/2 -translate-y-1/2" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 max-w-0 overflow-hidden opacity-0 group-hover:max-w-[140px] group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">Analytics</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              asChild
              size="sm"
              className={cn(navButtonClass(isActive('/manage-trades')), 'w-full h-auto min-h-[64px] !p-0')}
            >
              <Link href={manageTradesUrl} className="block w-full h-full relative min-h-[40px]">
                <FileText className="!h-6 !w-6 flex-shrink-0 absolute left-4 top-1/2 -translate-y-1/2" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 max-w-0 overflow-hidden opacity-0 group-hover:max-w-[140px] group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">Manage Trades</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="group/newtrade w-full h-auto min-h-[64px] cursor-pointer transition-all duration-300 relative overflow-hidden rounded-xl themed-btn-primary text-white font-semibold border-0 !p-0 hover:text-white [&_svg]:text-white [&_span]:text-white"
              onClick={() => setNewTradeModalOpen(true)}
            >
              <div className="block w-full h-full relative min-h-[40px]">
                <PlusCircle className="!h-6 !w-6 flex-shrink-0 absolute left-4 top-1/2 -translate-y-1/2" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 max-w-0 overflow-hidden opacity-0 group-hover:max-w-[140px] group-hover:opacity-100 transition-all duration-300 whitespace-nowrap text-white">New Trade</span>
              </div>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
            </Button>
            <Button
              variant="ghost"
              asChild
              size="sm"
              className={cn(navButtonClass(isActive('/my-trades')), 'w-full h-auto min-h-[64px] !p-0')}
            >
              <Link href={myTradesUrl} className="block w-full h-full relative min-h-[40px]">
                <TrendingUp className="!h-6 !w-6 flex-shrink-0 absolute left-4 top-1/2 -translate-y-1/2" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 max-w-0 overflow-hidden opacity-0 group-hover:max-w-[140px] group-hover:opacity-100 transition-all duration-300 whitespace-nowrap">My Trades</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* New Trade Modal */}
      <NewTradeModal
        isOpen={newTradeModalOpen}
        onClose={() => setNewTradeModalOpen(false)}
        onTradeCreated={() => {
          // Modal will handle query invalidation
          setNewTradeModalOpen(false);
        }}
      />
    </>
  );
}
