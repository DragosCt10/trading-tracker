import { getCachedUserSession } from '@/lib/server/session';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import Logo from '@/components/shared/Logo';
import { NavPillLink } from '@/components/shared/NavPillLink';
import SocialNavActions from './SocialNavActions';
import { Target } from 'lucide-react';
import type { ReactNode } from 'react';

export default async function SocialLayout({ children }: { children: ReactNode }) {
  let user = null;
  try {
    const session = await getCachedUserSession();
    user = session.user;
  } catch {
    // unauthenticated — render public layout
  }

  return (
    <div className="min-h-screen">
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

            {/* Nav links — authenticated: left side */}
            {user && (
              <>
                <Separator orientation="vertical" className="mx-3 hidden h-6 lg:flex" />
                <div className="hidden lg:block">
                  <NavPillLink href="/stats">
                    <Target className="h-4 w-4" />
                    <span>Go to app</span>
                  </NavPillLink>
                </div>
              </>
            )}

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-2">
              {/* Guest: Go to app on the right */}
              {!user && (
                <NavPillLink href="/stats">
                  <Target className="h-4 w-4" />
                  <span>Go to app</span>
                </NavPillLink>
              )}
              <SocialNavActions userId={user?.id ?? null} />
            </div>
          </div>
        </div>
      </nav>
      <div className="pt-20">
        {children}
      </div>
    </div>
  );
}
