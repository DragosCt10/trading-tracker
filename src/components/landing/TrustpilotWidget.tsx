'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    Trustpilot?: {
      loadFromElement: (el: HTMLElement, opts?: { forceReload?: boolean }) => void;
    };
  }
}

const TRUSTPILOT_URL = 'https://www.trustpilot.com/review/alpha-stats.com';
const TRUSTPILOT_BUSINESS_UNIT_ID = '69e5fe4960202033b33a72f6';
const TRUSTPILOT_TEMPLATE_ID = '56278e9abfbbba0bdcd568bc'; // Review Collector
const TRUSTPILOT_TOKEN = '6a6bd363-72fb-42c8-9696-b4442e669cdb';

interface TrustpilotWidgetProps {
  className?: string;
  /** Value forwarded to data-parallax-speed when used inside a parallax section. */
  parallaxSpeed?: number | string;
}

/**
 * Official Trustpilot TrustBox (Review Collector template).
 * Production-only: Trustpilot refuses to render on non-verified domains (localhost),
 * leaving a broken placeholder, so the widget is stripped from dev builds.
 */
export function TrustpilotWidget({ className, parallaxSpeed }: TrustpilotWidgetProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const isProd = process.env.NODE_ENV === 'production';

  // Re-init on mount (covers client-side nav where the bootstrap script has already loaded).
  useEffect(() => {
    if (!isProd) return;
    if (typeof window !== 'undefined' && window.Trustpilot && widgetRef.current) {
      window.Trustpilot.loadFromElement(widgetRef.current, { forceReload: true });
    }
  }, [isProd]);

  if (!isProd) return null;

  return (
    <>
      <Script
        id="trustpilot-bootstrap"
        src="//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"
        strategy="lazyOnload"
        onLoad={() => {
          if (window.Trustpilot && widgetRef.current) {
            window.Trustpilot.loadFromElement(widgetRef.current, { forceReload: true });
          }
        }}
      />
      <div
        ref={widgetRef}
        className={cn('trustpilot-widget', className)}
        data-locale="en-US"
        data-template-id={TRUSTPILOT_TEMPLATE_ID}
        data-businessunit-id={TRUSTPILOT_BUSINESS_UNIT_ID}
        data-style-height="52px"
        data-style-width="100%"
        data-token={TRUSTPILOT_TOKEN}
        data-parallax-speed={parallaxSpeed}
      >
        <a href={TRUSTPILOT_URL} target="_blank" rel="noopener noreferrer">
          Trustpilot
        </a>
      </div>
    </>
  );
}
