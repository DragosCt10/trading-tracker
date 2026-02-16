import { StrategiesClient } from './StrategiesClient';
import { getCachedUserSession } from '@/lib/server/trades';

export default async function StrategiesPage() {
  const { user } = await getCachedUserSession();

  if (!user) {
    return null; // Redirect handled by middleware/layout
  }

  return <StrategiesClient />;
}
