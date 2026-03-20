import Link from 'next/link';
import { LandingPricing } from '@/components/landing/LandingPricing';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-16">
      <section className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 sm:text-5xl">
          AlphaStats
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 dark:text-slate-300 sm:text-lg">
          Track performance and journal your trades with a clean analytics-first workflow.
        </p>
        <div className="mt-6 flex items-center justify-center">
          <Button
            asChild
            variant="outline"
            className="rounded-xl border-slate-200/70 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-800/30 text-slate-900 dark:text-slate-50"
          >
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </section>

      <LandingPricing />
    </div>
  );
} 