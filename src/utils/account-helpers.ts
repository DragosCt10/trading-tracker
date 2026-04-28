import type { AccountSettings, AccountType } from '@/types/account-settings';

/**
 * Canonical check for whether an account uses the futures (contracts × multiplier) P&L model
 * vs the standard (risk % × R:R × balance) model.
 *
 * Centralized here so the `account_type === 'futures'` branch logic doesn't scatter across
 * the form, validators, calculator, and stats pipeline. When account_type is undefined
 * (legacy accounts pre-migration), treats as standard.
 */
export function isFuturesAccount(
  account: Pick<AccountSettings, 'account_type'> | { account_type?: AccountType | null } | null | undefined,
): boolean {
  return account?.account_type === 'futures';
}
