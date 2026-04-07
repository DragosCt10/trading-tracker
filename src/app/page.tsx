import dynamic from 'next/dynamic';
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
import { getCachedUserSession } from '@/lib/server/session';

const LandingStatsBoard = dynamic(
  () => import('@/components/landing/LandingStatsBoard').then(m => ({ default: m.LandingStatsBoard })),
);
const LandingCustomStats = dynamic(
  () => import('@/components/landing/LandingCustomStats').then(m => ({ default: m.LandingCustomStats })),
);

export default async function Home() {
  const session = await getCachedUserSession().catch(() => null);

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

  return (
    <div className="landing-page-override w-full">
      <LandingNavbar isLoggedIn={!!session?.user} />

      <main id="main-content">
      <LandingHero />

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
  );
} 