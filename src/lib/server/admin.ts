'use server';

import { cache } from 'react';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import { getCachedUserSession } from './session';
import { grantSubscription, revokeSubscription } from './subscription';
import { TIER_DEFINITIONS } from '@/constants/tiers';
import type { ResolvedSubscription, SubscriptionRow } from '@/types/subscription';

// ── Admin checks ──────────────────────────────────────────────────────────────

/**
 * Returns true if the currently logged-in user has any admin role (admin OR super_admin).
 */
export async function isAdmin(): Promise<boolean> {
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

/** Request-level memoized version of `isAdmin`. */
export const getCachedIsAdmin = cache(isAdmin);

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
    .eq('role', 'super_admin')
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
    role: 'admin',
    granted_by: session.user!.id,
  });
  if (error) throw new Error(`grantAdminRole failed: ${error.message}`);
}

export async function revokeAdminRole(targetUserId: string): Promise<void> {
  if (!(await isSuperAdmin())) throw new Error('Unauthorized');

  const supabase = createServiceRoleClient();

  const { data } = await supabase
    .from('admin_roles')
    .select('role')
    .eq('user_id', targetUserId)
    .maybeSingle();
  if (data?.role === 'super_admin') throw new Error('Cannot remove a super admin');

  const { error } = await supabase
    .from('admin_roles')
    .delete()
    .eq('user_id', targetUserId);
  if (error) throw new Error(`revokeAdminRole failed: ${error.message}`);
}

export async function listAdmins(): Promise<{ userId: string; email: string; role: 'admin' | 'super_admin'; grantedAt: string }[]> {
  if (!(await isSuperAdmin())) throw new Error('Unauthorized');

  const supabase = createServiceRoleClient();
  const { data: roles, error } = await supabase
    .from('admin_roles')
    .select('user_id, role, created_at')
    .order('created_at', { ascending: true });

  if (error || !roles) return [];

  // Resolve emails via auth admin
  const results = await Promise.all(
    roles.map(async (r) => {
      const { data } = await supabase.auth.admin.getUserById(r.user_id);
      return {
        userId: r.user_id,
        email: data?.user?.email ?? '(unknown)',
        role: r.role as 'admin' | 'super_admin',
        grantedAt: r.created_at,
      };
    })
  );

  return results;
}

// ── Admin subscription management ────────────────────────────────────────────

/**
 * Fetch a user's subscription via service role (bypasses RLS).
 * Use this in admin contexts where the target user != logged-in user.
 */
export async function adminResolveSubscription(targetUserId: string): Promise<ResolvedSubscription> {
  if (!(await isAdmin())) throw new Error('Unauthorized');

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', targetUserId)
    .in('status', ['active', 'trialing', 'admin_granted', 'past_due'])
    .maybeSingle();

  if (error || !data) {
    return {
      tier: 'starter',
      definition: TIER_DEFINITIONS.starter,
      status: 'active',
      isActive: true,
      billingPeriod: null,
      periodEnd: null,
      cancelAtPeriodEnd: false,
      providerCustomerId: null,
      provider: 'admin',
      priceAmount: null,
      taxAmount: null,
      currency: null,
      createdAt: null,
    };
  }

  const row = data as SubscriptionRow;
  const definition = TIER_DEFINITIONS[row.tier] ?? TIER_DEFINITIONS.starter;
  const periodEnd = row.current_period_end ? new Date(row.current_period_end) : null;
  const isActive = row.status === 'active' || row.status === 'trialing' || row.status === 'admin_granted';

  return {
    tier: isActive ? row.tier : 'starter',
    definition: isActive ? definition : TIER_DEFINITIONS.starter,
    status: row.status,
    isActive,
    billingPeriod: row.billing_period,
    periodEnd,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    providerCustomerId: row.provider_customer_id,
    provider: row.provider,
    priceAmount: row.price_amount ?? null,
    taxAmount: row.tax_amount ?? null,
    currency: row.currency ?? null,
    createdAt: row.created_at ?? null,
  };
}

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
