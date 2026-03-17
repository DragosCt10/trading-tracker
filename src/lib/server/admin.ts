'use server';

import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { getCachedUserSession } from './session';
import { grantSubscription, revokeSubscription } from './subscription';

// ── Super admin check ─────────────────────────────────────────────────────────

/**
 * Returns true if the currently logged-in user is a super admin.
 * Reads admin_roles via service role (bypasses RLS).
 */
export async function isSuperAdmin(): Promise<boolean> {
  const session = await getCachedUserSession();
  if (!session.user) return false;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('admin_roles')
    .select('user_id')
    .eq('user_id', session.user.id)
    .maybeSingle();

  return !error && data !== null;
}

// ── Admin role management ─────────────────────────────────────────────────────

export async function grantAdminRole(targetUserId: string): Promise<void> {
  if (!(await isSuperAdmin())) throw new Error('Unauthorized');

  const session = await getCachedUserSession();
  const supabase = createServiceRoleClient();
  const { error } = await (supabase as any).from('admin_roles').insert({
    user_id: targetUserId,
    role: 'super_admin',
    granted_by: session.user!.id,
  });
  if (error) throw new Error(`grantAdminRole failed: ${error.message}`);
}

export async function revokeAdminRole(targetUserId: string): Promise<void> {
  if (!(await isSuperAdmin())) throw new Error('Unauthorized');

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from('admin_roles')
    .delete()
    .eq('user_id', targetUserId);
  if (error) throw new Error(`revokeAdminRole failed: ${error.message}`);
}

export async function listAdmins(): Promise<{ userId: string; email: string; grantedAt: string }[]> {
  if (!(await isSuperAdmin())) throw new Error('Unauthorized');

  const supabase = createServiceRoleClient();
  const { data: roles, error } = await supabase
    .from('admin_roles')
    .select('user_id, created_at')
    .order('created_at', { ascending: true });

  if (error || !roles) return [];

  // Resolve emails via auth admin
  const results = await Promise.all(
    roles.map(async (r) => {
      const { data } = await supabase.auth.admin.getUserById(r.user_id);
      return {
        userId: r.user_id,
        email: data?.user?.email ?? '(unknown)',
        grantedAt: r.created_at,
      };
    })
  );

  return results;
}

// ── Admin subscription management ────────────────────────────────────────────

export async function adminGrantSubscription(targetUserId: string, tier: 'pro' | 'elite'): Promise<void> {
  if (!(await isSuperAdmin())) throw new Error('Unauthorized');
  await grantSubscription(targetUserId, tier);
}

export async function adminRevokeSubscription(targetUserId: string): Promise<void> {
  if (!(await isSuperAdmin())) throw new Error('Unauthorized');
  await revokeSubscription(targetUserId);
}

/** Find a user by exact email (O(1) lookup via auth admin). Returns null if not found. */
export async function findUserByEmail(
  email: string
): Promise<{ id: string; email: string } | null> {
  if (!(await isSuperAdmin())) throw new Error('Unauthorized');

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  const user = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return null;
  return { id: user.id, email: user.email ?? email };
}
