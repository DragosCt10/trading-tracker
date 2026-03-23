import { getCachedUserSession } from '@/lib/server/session';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import Logo from '@/components/shared/Logo';
import { NavPillLink } from '@/components/shared/NavPillLink';
import { Footer } from '@/components/shared/Footer';
import SocialNavActions from './SocialNavActions';
import type { ReactNode } from 'react';

export default async function SocialLayout({ children }: { children: ReactNode }) {
  const session = await getCachedUserSession().catch(() => null);
  if (!session?.user) {
    redirect('/login');
  }
  const user = session!.user;

  return (
    <div className="max-w-(--breakpoint-xl) mx-auto min-h-screen flex flex-col">
      <nav className="fixed top-4 left-0 right-0 z-50 mx-auto w-full max-w-5xl">
        <div className="relative rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40">
          <div className="themed-nav-overlay pointer-events-none absolute inset-0 rounded-2xl" />
          <div className="relative flex items-center px-3 py-2 sm:px-4 sm:py-2.5">
            {/* Logo */}
            <Link href="/" className="flex items-center font-semibold text-slate-900 dark:text-slate-50">
              <Logo className="absolute top-2.5 lg:w-8.5 lg:h-8.5 w-12 h-12" />
              <div className="hidden lg:flex items-center ml-9 gap-2.5">
                <span className="text-sm font-semibold tracking-widest text-slate-900 dark:text-slate-50">
                  AlphaStats
                </span>
                <Separator orientation="vertical" className="h-4" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Level
                </span>
              </div>
            </Link>

            {/* Right actions — Go to app first (same slot as former tier badge), then theme/actions */}
            <div className="ml-auto flex items-center gap-2">
              <NavPillLink href="/stats">
                {/* <Target className="h-4 w-4" /> */}
                <span>Go to app</span>
              </NavPillLink>
              <SocialNavActions userId={user?.id ?? null} />
            </div>
          </div>
        </div>
      </nav>
      <div className="pt-20 flex-1">
        {children}
      </div>
      <div className="w-full max-w-5xl mx-auto">
        <Footer />
      </div>
    </div>
  );
}
