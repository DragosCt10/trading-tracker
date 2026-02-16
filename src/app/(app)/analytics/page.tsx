import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Redirect /analytics to /strategies
 * All analytics are now accessed via the dynamic route /analytics/[strategy]
 */
export default async function AnalyticsPage() {
  redirect('/strategies');
}
