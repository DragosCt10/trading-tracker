/**
 * Active payment provider.
 * To swap providers: replace LemonSqueezyProvider with the new implementation.
 * The rest of the codebase only imports from this file.
 */

import { LemonSqueezyProvider } from './lemonsqueezy.provider';
import type { IPaymentProvider } from './provider.interface';

const REQUIRED_ENV_VARS = [
  'LEMONSQUEEZY_API_KEY',
  'LEMONSQUEEZY_STORE_ID',
  'LEMONSQUEEZY_WEBHOOK_SECRET',
  'LEMONSQUEEZY_PRO_VARIANT_ID_MONTHLY',
  'LEMONSQUEEZY_PRO_VARIANT_ID_ANNUAL',
] as const;

/**
 * Called once at module load time (server start).
 * Throws with a clear message if any billing env var is missing.
 */
function validateBillingEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `[billing] Missing required environment variables: ${missing.join(', ')}. ` +
        'Add them to .env.local before starting the server.'
    );
  }
}

let _provider: IPaymentProvider | null = null;

export function getPaymentProvider(): IPaymentProvider {
  if (!_provider) {
    validateBillingEnv();
    _provider = new LemonSqueezyProvider(
      process.env.LEMONSQUEEZY_API_KEY!,
      process.env.LEMONSQUEEZY_STORE_ID!
    );
  }
  return _provider;
}
