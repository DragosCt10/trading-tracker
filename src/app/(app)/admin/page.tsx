import { getCachedUserSession } from '@/lib/server/session';
import { isSuperAdmin, listAdmins } from '@/lib/server/admin';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  const isAdmin = await isSuperAdmin();
  if (!isAdmin) redirect('/');

  const admins = await listAdmins();

  return <AdminClient currentUserId={user.id} admins={admins} />;
}
