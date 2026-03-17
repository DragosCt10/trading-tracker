/**
 * Active payment provider.
 * To swap to Stripe or Paddle: replace PolarProvider with the new implementation.
 * The rest of the codebase only imports from this file.
 */

import { PolarProvider } from './polar.provider';
import type { IPaymentProvider } from './provider.interface';

const REQUIRED_ENV_VARS = [
  'POLAR_ACCESS_TOKEN',
  'POLAR_WEBHOOK_SECRET',
  'POLAR_PRO_PRODUCT_ID',
  'POLAR_PRO_PRICE_ID_MONTHLY',
  'POLAR_PRO_PRICE_ID_ANNUAL',
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
    _provider = new PolarProvider(process.env.POLAR_ACCESS_TOKEN!);
  }
  return _provider;
}
