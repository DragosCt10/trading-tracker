import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingHero } from '@/components/landing/LandingHero';
import { LandingFeatures } from '@/components/landing/LandingFeatures';
import { LandingPricing } from '@/components/landing/LandingPricing';

export default function Home() {
  return (
    <div className="landing-page-override w-full pt-16 sm:pt-[68px]">
      <LandingHeader />

      <LandingHero />

      <LandingFeatures />

      {/* <div id="pricing" className="scroll-mt-20 mx-auto max-w-6xl px-4 pb-10">
        <LandingPricing />
      </div> */}
    </div>
  );
} 