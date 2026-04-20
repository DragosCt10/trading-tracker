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

/**
 * Social-proof simulation for the launch-offer banner. The DISPLAYED slot
 * count is `max(actualSubscribers, simulatedCount)`, capped at
 * `EARLY_BIRD_LIMIT`. The simulated counter begins at
 * `EARLY_BIRD_START_COUNT` at `EARLY_BIRD_LAUNCH_ISO` and advances by +1
 * every `EARLY_BIRD_INTERVAL_HOURS` hours.
 *
 * IMPORTANT: these constants drive DISPLAY ONLY. Checkout eligibility and
 * price variant selection must continue to use the real slot count from
 * `getEarlyBirdSlotsUsed()` so we never sell past the true cap.
 *
 * Adjust `EARLY_BIRD_LAUNCH_ISO` at campaign launch so the counter starts
 * at the correct moment.
 */
export const EARLY_BIRD_LAUNCH_ISO = '2026-04-21T00:00:00Z';
export const EARLY_BIRD_START_COUNT = 3;
export const EARLY_BIRD_INTERVAL_HOURS = 2;
