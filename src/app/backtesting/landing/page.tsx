import type { Metadata } from 'next';
import { LandingNavbar } from '@/components/landing/LandingNavbar';
import Footer from '@/components/shared/Footer';
import { buildPageMetadata } from '@/constants/seo';
import { BacktestingLandingClient } from './BacktestingLandingClient';

export const metadata: Metadata = buildPageMetadata({
  title: 'Free Backtesting Demo — Try the Chart',
  description:
    'Try the AlphaStats backtesting chart with 10 years of forex, crypto and indices data. No signup, no account required.',
  path: '/backtesting/landing',
});

export default function BacktestingLandingPage() {
  return (
    <div className="landing-page-override w-full">
      <LandingNavbar />
      <main id="main-content">
        <BacktestingLandingClient />
      </main>
      <Footer />
    </div>
  );
}
