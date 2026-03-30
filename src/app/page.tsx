import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingStatsBoard } from '@/components/landing/LandingStatsBoard';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingPricing } from '@/components/pricing/LandingPricing';

export default function Home() {
  return (
    <div className="landing-page-override w-full">
      <LandingHeader />

      <LandingHero />

      <LandingStatsBoard />

      <LandingFeatures />

      {/* <div id="pricing" className="scroll-mt-20 mx-auto max-w-6xl px-4 pb-10">
        <LandingPricing />
      </div> */}
    </div>
  );
} 