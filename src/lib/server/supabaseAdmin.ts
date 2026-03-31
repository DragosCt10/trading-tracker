/**
 * Service-role Supabase client for feed tables.
 *
 * The Database type in src/types/supabase.ts does not include feed tables
 * (run `supabase gen types typescript` after feed schema additions to fix this properly).
 * Centralising the cast here means no other file needs `(... as any)` for admin operations.
 */
import { createServiceRoleClient } from '@/utils/supabase/service-role';

export function createAdminClient(): any {
  return createServiceRoleClient();
}
