import { redirect } from 'next/navigation';
import { StrategiesClient } from './StrategiesClient';
import { getCachedUserSession } from '@/lib/server/session';

export default async function StrategiesPage() {
  const { user } = await getCachedUserSession();

  if (!user) redirect('/login');

  return <StrategiesClient />;
}
