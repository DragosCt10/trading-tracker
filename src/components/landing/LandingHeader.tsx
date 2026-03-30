'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const { theme, toggleTheme, mounted } = useTheme();

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

  /* --- Theme toggle icon (shared between desktop & mobile) --- */
  const themeIcon = !mounted ? (
    <svg className="h-4 w-4 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
  ) : theme === 'dark' ? (
    <svg className="h-4 w-4 text-amber-400 transition-transform duration-500 group-hover:rotate-180" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd" />
    </svg>
  ) : (
    <svg className="h-4 w-4 text-slate-500 transition-transform duration-500 group-hover:rotate-180" fill="currentColor" viewBox="0 0 20 20">
      <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
    </svg>
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
        {/* ── Animated gradient bottom border (scan line effect) ── */}
        <div className="absolute bottom-0 left-0 right-0 h-px overflow-hidden">
          {/* Static base line */}
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-500',
              scrolled ? 'opacity-100' : 'opacity-30',
            )}
            style={{
              background: `linear-gradient(90deg, transparent, color-mix(in oklch, var(--tc-primary) 30%, transparent), transparent)`,
            }}
          />
          {/* Moving scan highlight */}
          <div
            className="header-scan-line absolute inset-0"
            style={{
              background: `linear-gradient(90deg, transparent 20%, var(--tc-primary) 50%, transparent 80%)`,
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Logo with breathing glow */}
          <Link
            href="/"
            className="flex-shrink-0 header-entrance header-entrance-delay-1"
            aria-label="AlphaStats Home"
          >
            <Logo className="w-[38px] h-[38px] header-logo-breathe" />
          </Link>

          {/* ── Desktop: HUD-style nav pill ── */}
          <div className="hidden lg:flex items-center gap-[30px] rounded-full hud-brackets px-10 py-2 border border-slate-300/20 dark:border-white/[0.08] bg-white/40 dark:bg-white/[0.03] backdrop-blur-md header-entrance header-entrance-delay-2">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="futuristic-nav-link text-[13px] font-light tracking-wider uppercase text-slate-500 dark:text-white/50 hover:text-slate-900 dark:hover:text-white whitespace-nowrap"
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
              className="cursor-pointer h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-300 group hover:shadow-[0_0_12px_color-mix(in_oklch,var(--tc-primary)_30%,transparent)]"
              aria-label="Color theme"
            >
              <Palette className="h-4 w-4" style={{ color: 'var(--tc-primary)' }} />
            </button>

            {/* Dark/light toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="cursor-pointer h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-300 group hover:shadow-[0_0_12px_color-mix(in_oklch,var(--tc-primary)_30%,transparent)]"
              aria-label="Toggle theme"
            >
              {themeIcon}
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
            <button
              type="button"
              onClick={toggleTheme}
              className="cursor-pointer h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors group"
              aria-label="Toggle theme"
            >
              {themeIcon}
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
                    <Logo className="w-6 h-6 header-logo-breathe" />
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
