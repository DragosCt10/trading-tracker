import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Redirect /strategy to /strategies
 * All strategies are now accessed via the /strategies route.
 */
export default function StrategyPage() {
  redirect('/strategies');
}
