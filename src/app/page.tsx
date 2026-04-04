import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingStatsBoard } from '@/components/landing/LandingStatsBoard';
import { LandingModes } from '@/components/landing/LandingModes';
import { LandingFutureEquity } from '@/components/landing/LandingFutureEquity';
import { LandingDailyJournal } from '@/components/landing/LandingDailyJournal';
import { LandingCustomStats } from '@/components/landing/LandingCustomStats';
import { LandingAiVision } from '@/components/landing/LandingAiVision';
import { LandingSocialFeed } from '@/components/landing/LandingSocialFeed';
import { LandingTestimonials } from '@/components/landing/LandingTestimonials';
import { LandingMidCTA } from '@/components/landing/LandingMidCTA';
import { LandingCTA } from '@/components/landing/LandingCTA';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import Footer from '@/components/shared/Footer';

export default function Home() {
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
      <LandingNavbar />

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

      <LandingTestimonials />

      {/* <div id="pricing" className="scroll-mt-20 mx-auto max-w-6xl px-4 pb-10">
        <LandingPricing />
      </div> */}

      <LandingCTA />

      <Footer />
    </div>
  );
} 