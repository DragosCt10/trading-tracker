/**
 * Launch-offer pricing: the first N paying Pro subscribers (shared pool across
 * monthly + annual billing) get a discounted rate. Slot count is sourced from
 * the `subscriptions` table via `getEarlyBirdSlotsUsed()` and enforced on the
 * server inside the checkout server actions.
 */

export const EARLY_BIRD_LIMIT = 20;

export const EARLY_BIRD_MONTHLY_PRICE = 9.99;
export const EARLY_BIRD_ANNUAL_PRICE = 95.90;
export const EARLY_BIRD_ANNUAL_SAVINGS_PCT = 20;

// `subscriptions.price_amount` is stored in cents (see ResolvedSubscription.priceAmount).
// Used by the slot count query to identify early-bird rows.
export const EARLY_BIRD_MONTHLY_PRICE_CENTS = Math.round(EARLY_BIRD_MONTHLY_PRICE * 100);
export const EARLY_BIRD_ANNUAL_PRICE_CENTS = Math.round(EARLY_BIRD_ANNUAL_PRICE * 100);
