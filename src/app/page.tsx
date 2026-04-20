import dynamic from 'next/dynamic';
import type { Metadata } from 'next';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingModes } from '@/components/landing/LandingModes';
import { LandingFutureEquity } from '@/components/landing/LandingFutureEquity';
import { LandingDailyJournal } from '@/components/landing/LandingDailyJournal';
import { LandingAiVision } from '@/components/landing/LandingAiVision';
import { LandingSocialFeed } from '@/components/landing/LandingSocialFeed';
import { LandingTestimonialsClient } from '@/components/landing/LandingTestimonialsClient';
import { LandingMidCTA } from '@/components/landing/LandingMidCTA';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import Footer from '@/components/shared/Footer';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import type { PlatformStats, PlatformStatsRpcResponse } from '@/types/platform-stats';
import { buildPageMetadata } from '@/constants/seo';
import { getEarlyBirdSlotsUsed } from '@/lib/server/earlyBird';
import { GeneralOfferBanner } from '@/components/landing/GeneralOfferBanner';

export const revalidate = 86400; // 24 hours — ISR for landing page stats

export const metadata: Metadata = buildPageMetadata({
  title: 'AlphaStats — Trading Journal & Analytics for Serious Traders',
  description:
    'Track every trade, find your edge, and improve faster. AlphaStats is the trading journal built by traders for traders — forex, stocks, crypto, futures.',
  path: '/',
});

const LandingStatsBoard = dynamic(
  () => import('@/components/landing/LandingStatsBoard').then(m => ({ default: m.LandingStatsBoard })),
);
const LandingCustomStats = dynamic(
  () => import('@/components/landing/LandingCustomStats').then(m => ({ default: m.LandingCustomStats })),
);

const STATS_FALLBACK: PlatformStats = {
  tradersCount: 1200,
  tradesCount: 4_200_000,
  statsBoardsCount: 3800,
};

// Round up to a marketing-friendly ceiling: next half of the leading magnitude
// (e.g. 12→15, 28→30, 80,400→85,000, 4,200,000→4,500,000).
function niceCeil(n: number): number {
  if (n <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(n)));
  const lead = n / mag;
  return (Math.ceil(lead * 2) / 2) * mag;
}

function formatCompactStat(n: number): string {
  const rounded = niceCeil(n);
  if (rounded >= 1_000_000) {
    const m = rounded / 1_000_000;
    if (m >= 1000) return `${(m / 1000).toFixed(1).replace(/\.0$/, '')}B+`;
    return `${m.toFixed(1).replace(/\.0$/, '')}M+`;
  }
  if (rounded >= 1_000) {
    const k = rounded / 1_000;
    if (k >= 1000) return `${(k / 1000).toFixed(1).replace(/\.0$/, '')}M+`;
    return `${k.toFixed(1).replace(/\.0$/, '')}K+`;
  }
  return `${rounded}+`;
}

async function fetchPlatformStats(): Promise<PlatformStats> {
  try {
    const supabase = createServiceRoleClient();
    const { data: raw, error } = await supabase.rpc('get_platform_stats');
    if (error || !raw) {
      console.error('[platformStats] RPC error:', error?.message);
      return STATS_FALLBACK;
    }
    const data = raw as unknown as PlatformStatsRpcResponse;
    return {
      tradersCount: data.traders_count ?? STATS_FALLBACK.tradersCount,
      tradesCount: data.trades_count ?? STATS_FALLBACK.tradesCount,
      statsBoardsCount: data.stats_boards_count ?? STATS_FALLBACK.statsBoardsCount,
    };
  } catch (err) {
    console.error('[platformStats] unexpected error:', err);
    return STATS_FALLBACK;
  }
}

export default async function Home() {
  if (process.env.NEXT_PUBLIC_UNDER_CONSTRUCTION === 'true') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <div className="text-6xl font-bold tracking-tight">🚧</div>
          <h1 className="text-4xl font-bold tracking-tight">Under Construction</h1>
          <p className="text-zinc-400 text-lg">We&apos;re working on something great. Check back soon.</p>
        </div>
      </div>
    );
  }

  const [raw, earlyBirdSlotsUsed] = await Promise.all([
    fetchPlatformStats(),
    getEarlyBirdSlotsUsed(),
  ]);

  // x2 applied server-side — raw values never reach the client
  const heroStats = [
    { label: 'Traders',        value: formatCompactStat(raw.tradersCount * 2) },
    { label: 'Trades tracked', value: formatCompactStat(raw.tradesCount * 2) },
    { label: 'Stats Board',    value: formatCompactStat(raw.statsBoardsCount * 2) },
  ];

  return (
    <>
      <GeneralOfferBanner slotsUsed={earlyBirdSlotsUsed} />
      <div className="landing-page-override w-full">
      <LandingNavbar />

      <main id="main-content">
      <LandingHero heroStats={heroStats} />

      <LandingStatsBoard />

      <LandingFeatures />

      <LandingModes />

      <LandingDailyJournal />

      <LandingCustomStats />

      <LandingMidCTA />

      <LandingAiVision />

      <LandingFutureEquity />

      <LandingSocialFeed />

      <LandingTestimonialsClient />

      <LandingCTA />
      </main>

      <Footer />
      </div>
    </>
  );
}