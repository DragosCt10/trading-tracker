/**
 * Reusable pricing-promo mechanism. Serves discounted Pro variants to the
 * first N paying subscribers of a campaign. Slot count is sourced from the
 * `subscriptions` table via `getPromoSlotsUsed()` and enforced on the server
 * inside the checkout server actions.
 *
 * Retune the constants below (limit, prices, launch date, simulated ticker)
 * to run a new campaign without touching call sites.
 */

export const PROMO_LIMIT = 20;

export const PROMO_MONTHLY_PRICE = 9.99;
export const PROMO_ANNUAL_PRICE = 95.90;
export const PROMO_ANNUAL_SAVINGS_PCT = 20;

// `subscriptions.price_amount` is stored in cents (see ResolvedSubscription.priceAmount).
// Used by the slot count query to identify promo rows.
export const PROMO_MONTHLY_PRICE_CENTS = Math.round(PROMO_MONTHLY_PRICE * 100);
export const PROMO_ANNUAL_PRICE_CENTS = Math.round(PROMO_ANNUAL_PRICE * 100);

/**
 * Social-proof simulation for the promo banner. The DISPLAYED slot count is
 * `max(actualSubscribers, simulatedCount)`, capped at `PROMO_LIMIT`. The
 * simulated counter begins at `PROMO_START_COUNT` at `PROMO_LAUNCH_ISO` and
 * advances by +1 every `PROMO_INTERVAL_HOURS` hours.
 *
 * IMPORTANT: these constants drive DISPLAY ONLY. Checkout eligibility and
 * price variant selection must continue to use the real slot count from
 * `getPromoSlotsUsed()` so we never sell past the true cap.
 *
 * Adjust `PROMO_LAUNCH_ISO` at campaign launch so the counter starts at the
 * correct moment.
 */
export const PROMO_LAUNCH_ISO = '2026-04-20T17:00:00Z';
export const PROMO_START_COUNT = 3;
export const PROMO_INTERVAL_HOURS = 2;
