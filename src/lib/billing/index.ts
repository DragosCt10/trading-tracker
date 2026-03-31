/**
 * Active payment provider.
 * To swap to Stripe or Paddle: replace PolarProvider with the new implementation.
 * The rest of the codebase only imports from this file.
 */

import { PolarProvider } from './polar.provider';
import type { IPaymentProvider } from './provider.interface';

const PRODUCTION_ENV_VARS = [
  'POLAR_ACCESS_TOKEN',
  'POLAR_WEBHOOK_SECRET',
  'POLAR_PRO_PRODUCT_ID_MONTHLY',
  'POLAR_PRO_PRODUCT_ID_ANNUAL',
] as const;

const SANDBOX_ENV_VARS = [
  'POLAR_SANDBOX_ACCESS_TOKEN',
  'POLAR_SANDBOX_WEBHOOK_SECRET',
  'POLAR_SANDBOX_PRO_PRODUCT_ID_MONTHLY',
  'POLAR_SANDBOX_PRO_PRODUCT_ID_ANNUAL',
] as const;

export function isPolarSandbox(): boolean {
  return process.env.POLAR_SANDBOX === 'true';
}

/**
 * Called once at module load time (server start).
 * Throws with a clear message if any billing env var is missing.
 */
function validateBillingEnv(): void {
  const required = isPolarSandbox() ? SANDBOX_ENV_VARS : PRODUCTION_ENV_VARS;
  const missing = required.filter((key) => !process.env[key]);
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
    const sandbox = isPolarSandbox();
    const accessToken = sandbox
      ? process.env.POLAR_SANDBOX_ACCESS_TOKEN!
      : process.env.POLAR_ACCESS_TOKEN!;
    _provider = new PolarProvider(accessToken, sandbox ? 'sandbox' : 'production');
  }
  return _provider;
}
