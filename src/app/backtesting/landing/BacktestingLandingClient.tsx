'use client';

import { LandingHero } from '@/components/landing/LandingHero';
import { DemoChartSection } from './DemoChartSection';

const HERO_STATS = [
  { label: 'Symbols', value: '50+' },
  { label: 'Years of data', value: '10' },
  { label: 'Cost', value: 'Free' },
];

export function BacktestingLandingClient() {
  return (
    <>
      <LandingHero
        heroStats={HERO_STATS}
        badge="Free backtesting · No signup"
        headlineLine1="Backtest your strategy."
        headlineLine2="Free. No signup."
        subtitle="10 years of forex, crypto and indices data. Test ideas in seconds — right here, no account required."
        primaryCTA={{ href: '/signup', label: 'Start backtesting free' }}
        secondaryCTA={{ anchorId: '#demo-chart', label: 'Try the demo' }}
        showTrustpilot={false}
      />
      <DemoChartSection />
    </>
  );
}
