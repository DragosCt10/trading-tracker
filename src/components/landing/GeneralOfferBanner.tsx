'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EARLY_BIRD_LIMIT } from '@/constants/earlyBird';
import { useDisplayedEarlyBirdSlots } from '@/utils/earlyBirdSlots';

const DISMISS_KEY = 'generalOfferBanner:dismissed:v1';
const BANNER_H_VAR = '--tt-banner-h';
const BANNER_BOTTOM_GAP_PX = 16; // matches `bottom-4`
const APPEAR_DELAY_MS = 2000;

interface GeneralOfferBannerProps {
  /** Real subscriber count from the DB. Used as a floor for the display count. */
  slotsUsed: number;
}

export function GeneralOfferBanner({ slotsUsed }: GeneralOfferBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const displayed = useDisplayedEarlyBirdSlots(slotsUsed);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- portal target and sessionStorage are only available post-mount; required to avoid SSR hydration mismatch */
    setMounted(true);
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(DISMISS_KEY) === '1') {
      setIsVisible(false);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Trigger the entrance animation after a short delay so the hero gets the
  // user's attention first. Runs once the banner is actually going to render.
  useEffect(() => {
    if (!mounted || !isVisible || displayed >= EARLY_BIRD_LIMIT) return;
    const t = window.setTimeout(() => setShown(true), APPEAR_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [mounted, isVisible, displayed]);

  // Publish the banner's occupied height (card + bottom gap) so page content
  // can reserve padding-bottom and the footer isn't covered. Gated on `shown`
  // so the reserved space animates in alongside the banner's entrance.
  useEffect(() => {
    if (!isVisible || !shown || displayed >= EARLY_BIRD_LIMIT) return;
    const el = wrapperRef.current;
    if (!el) return;

    const root = document.documentElement;
    const publish = () => {
      root.style.setProperty(
        BANNER_H_VAR,
        `${el.offsetHeight + BANNER_BOTTOM_GAP_PX}px`,
      );
    };
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty(BANNER_H_VAR);
    };
  }, [isVisible, shown, displayed]);

  function handleClose() {
    setIsVisible(false);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // sessionStorage may be unavailable (private mode) — ignore.
    }
  }

  if (!isVisible) return null;
  if (displayed >= EARLY_BIRD_LIMIT) return null;
  if (!mounted) return null;

  return createPortal(
    <div
      ref={wrapperRef}
      data-general-banner
      role="region"
      aria-label="Offer"
      className={`fixed bottom-4 inset-x-0 z-[60] mx-auto w-full max-w-3xl px-4 transition-all duration-500 ease-out motion-reduce:transition-none ${
        shown
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-6 pointer-events-none'
      }`}
    >
      <div className="relative rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-white/70 dark:bg-[#08060e]/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 text-slate-900 dark:text-slate-50">
        {/* Animated rotating-conic border — same treatment as the "Ready to own
         * your trading results?" CTA section. */}
        <div
          aria-hidden
          className="absolute -inset-[1px] rounded-2xl pointer-events-none cta-border-glow"
        />
        <div className="relative flex items-center gap-3 px-5 py-3">
        <p className="text-base font-medium text-slate-900 dark:text-white">
          <span aria-hidden="true" className="mr-1.5">🔥</span>
          Early Bird Launch Offer — locked in for life
        </p>
        <span
          className="shrink-0 rounded-full border border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm px-3.5 py-1 text-xs font-semibold tracking-wider tabular-nums text-slate-900 dark:text-white"
          aria-label={`${displayed} of ${EARLY_BIRD_LIMIT} early-bird slots claimed`}
        >
          {displayed}/{EARLY_BIRD_LIMIT}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/pricing"
            className="group relative overflow-hidden inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide rounded-lg transition-all duration-300 bg-white text-slate-900 hover:bg-white/90"
            style={{
              boxShadow: '0 6px 16px -4px color-mix(in oklch, var(--tc-primary) 50%, transparent)',
            }}
          >
            <span className="relative z-10 flex items-center gap-1.5">
              Claim offer
              <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform duration-300" />
            </span>
          </Link>
          <Button
            variant="ghost"
            className="group size-8 shrink-0 p-0 hover:bg-transparent"
            onClick={handleClose}
            aria-label="Close banner"
          >
            <X
              size={16}
              strokeWidth={2}
              className="opacity-60 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          </Button>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

