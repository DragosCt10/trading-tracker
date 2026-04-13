/**
 * Server-only helper for early-bird slot counting. No 'use server' — called
 * from the pricing server component and subscription.ts, not from the client.
 * Mirrors the pattern in session.ts so the React cache() wrapper is allowed.
 */
import { cache } from 'react';
import { createServiceRoleClient } from '@/utils/supabase/service-role';
import {
  EARLY_BIRD_LIMIT,
  EARLY_BIRD_MONTHLY_PRICE_CENTS,
  EARLY_BIRD_ANNUAL_PRICE_CENTS,
} from '@/constants/earlyBird';

/**
 * Counts paying Pro subscribers created through the early-bird Lemon Squeezy
 * variants. Identification is by `price_amount` (stored in cents by the LS
 * webhook handler) matching either of the early-bird prices. Service role is
 * used to bypass RLS so this can run from the public pricing page without a
 * session.
 *
 * Fail-safe: any error returns 0 so the pricing page still renders. The
 * `createPublicCheckoutUrl` server action does its own cap re-check before
 * routing to the early-bird variant, so this count is used only for display.
 */
async function _getEarlyBirdSlotsUsed(): Promise<number> {
  try {
    const supabase = createServiceRoleClient();
    const { count, error } = await supabase
      .from('subscriptions')
      .select('user_id', { count: 'exact', head: true })
      .eq('tier', 'pro')
      .eq('provider', 'lemonsqueezy')
      .in('status', ['active', 'trialing', 'past_due'])
      .in('price_amount', [EARLY_BIRD_MONTHLY_PRICE_CENTS, EARLY_BIRD_ANNUAL_PRICE_CENTS]);

    if (error || count == null) {
      console.error('[earlyBird] slot count query failed:', error?.message);
      return 0;
    }
    return Math.min(count, EARLY_BIRD_LIMIT);
  } catch (err) {
    console.error('[earlyBird] unexpected error counting slots:', err);
    return 0;
  }
}

export const getEarlyBirdSlotsUsed = cache(_getEarlyBirdSlotsUsed);
