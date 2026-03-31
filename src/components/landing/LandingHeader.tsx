'use client';

import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import Link from 'next/link';
import { Menu, X, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useTheme } from '@/hooks/useTheme';
import Logo from '@/components/shared/Logo';
import { ThemePickerModal } from '@/components/shared/ThemePickerModal';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Testimonials', href: '#testimonials' },
] as const;

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  useTheme();

  // Landing and pricing pages are always dark — force regardless of stored preference
  useLayoutEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.dataset.forceDark = 'true';
    return () => {
      delete document.documentElement.dataset.forceDark;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      if (!href.startsWith('#')) {
        // Full path — let normal navigation proceed
        setMobileMenuOpen(false);
        return;
      }
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setMobileMenuOpen(false);
    },
    [],
  );


  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav
        className={cn(
          'relative transition-all duration-500',
          scrolled
            ? 'bg-white/70 dark:bg-[#08060e]/80 backdrop-blur-2xl'
            : 'bg-transparent',
        )}
      >
        {/* ── Animated scan line (login page gradient) ── */}
        <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
          <div
            className="header-scan-line absolute inset-0 opacity-50"
            style={{
              background: `linear-gradient(90deg, transparent 35%, var(--tc-primary) 50%, transparent 65%)`,
            }}
          />
        </div>

        {/* ── Subtle top-edge glow when scrolled ── */}
        {scrolled && (
          <div
            aria-hidden
            className="pointer-events-none absolute -top-px left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent 10%, color-mix(in oklch, var(--tc-primary) 20%, transparent) 50%, transparent 90%)`,
            }}
          />
        )}

        {/* ── Main content ── */}
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Logo with breathing glow */}
          <Link
            href="/"
            className="flex items-center gap-2.5 flex-shrink-0 header-entrance header-entrance-delay-1"
            aria-label="AlphaStats Home"
          >
            <Logo className="w-[38px] h-[38px] header-logo" />
            <span className="text-[15px] font-semibold tracking-widest text-slate-900 dark:text-white">
              AlphaStats
            </span>
          </Link>

          {/* ── Desktop: HUD-style nav pill ── */}
          <div className="hidden lg:flex items-center gap-[30px] rounded-full hud-brackets px-10 py-2 border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm header-entrance header-entrance-delay-2">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="futuristic-nav-link text-[13px] font-light tracking-wider uppercase text-muted-foreground hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* ── Desktop: CTA area ── */}
          <div className="hidden lg:flex items-center gap-3 flex-shrink-0 header-entrance header-entrance-delay-3">
            {/* Color theme picker */}
            <button
              type="button"
              onClick={() => setThemePickerOpen(true)}
              className="cursor-pointer h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-slate-900 dark:hover:text-white transition-all duration-300 group hover:shadow-[0_0_12px_color-mix(in_oklch,var(--tc-primary)_30%,transparent)]"
              aria-label="Color theme"
            >
              <Palette className="h-4 w-4" style={{ color: 'var(--tc-primary)' }} />
            </button>

            {/* CTA — Login button matching LoginPage gradient */}
            <Link
              href="/login"
              className="relative overflow-hidden flex items-center justify-center gap-1.5 px-5 py-1.5 rounded-xl text-[13px] font-semibold text-white whitespace-nowrap shadow-lg hover:shadow-xl transition-all duration-300 group border-0"
              style={{
                background: `linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))`,
                boxShadow: '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
              }}
            >
              <span className="relative z-10 leading-[22px]">Login</span>
              {/* Shimmer sweep on hover */}
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
            </Link>
          </div>

          {/* ── Mobile: theme toggle + hamburger ── */}
          <div className="lg:hidden flex items-center gap-2 flex-shrink-0 header-entrance header-entrance-delay-3">
            <button
              type="button"
              onClick={() => setThemePickerOpen(true)}
              className="cursor-pointer h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
              aria-label="Color theme"
            >
              <Palette className="h-4 w-4" style={{ color: 'var(--tc-primary)' }} />
            </button>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                  aria-label="Open menu"
                >
                  {mobileMenuOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-72 border-slate-200/30 dark:border-white/[0.06] bg-white/95 dark:bg-[#08060e]/95 backdrop-blur-2xl"
              >
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-50">
                    <Logo className="w-6 h-6 header-logo" />
                    <span className="font-light tracking-wider">AlphaStats</span>
                  </SheetTitle>
                </SheetHeader>

                {/* Decorative scan line in mobile menu */}
                <div className="mt-4 h-px w-full overflow-hidden">
                  <div
                    className="header-scan-line h-full"
                    style={{
                      background: `linear-gradient(90deg, transparent 20%, var(--tc-primary) 50%, transparent 80%)`,
                    }}
                  />
                </div>

                <nav className="mt-4 flex flex-col gap-1">
                  {NAV_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className="flex h-10 items-center rounded-xl px-3 text-sm font-light tracking-wider uppercase text-slate-600 dark:text-white/50 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-white/[0.04] transition-all duration-300 hover:shadow-[inset_0_0_12px_color-mix(in_oklch,var(--tc-primary)_10%,transparent)]"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>

                <Separator className="my-4 bg-slate-200/50 dark:bg-white/[0.06]" />

                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="relative overflow-hidden flex items-center justify-center w-full px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 group border-0"
                  style={{
                    background: `linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))`,
                    boxShadow: '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
                  }}
                >
                  <span className="relative z-10">Login</span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
                </Link>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
      <ThemePickerModal open={themePickerOpen} onClose={() => setThemePickerOpen(false)} />
    </header>
  );
}
