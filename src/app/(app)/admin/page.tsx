import { getCachedUserSession } from '@/lib/server/session';
import { isAdmin, isSuperAdmin, listAdmins } from '@/lib/server/admin';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { user } = await getCachedUserSession();
  if (!user) redirect('/login');

  const hasAccess = await isAdmin();
  if (!hasAccess) redirect('/');

  const superAdmin = await isSuperAdmin();
  const admins = superAdmin ? await listAdmins() : [];

  return <AdminClient currentUserId={user.id} admins={admins} isSuperAdmin={superAdmin} />;
}
