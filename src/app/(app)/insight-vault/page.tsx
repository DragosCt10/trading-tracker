import { getCachedUserSession } from '@/lib/server/trades';
import { redirect } from 'next/navigation';
import NotesData from './NotesData';

export const dynamic = 'force-dynamic';

export default async function NotesPage() {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');
  return <NotesData user={user} />;
}
