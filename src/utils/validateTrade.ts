import type { Trade } from '@/types/trade';
import type { AccountType, CustomFuturesSpec } from '@/types/account-settings';
import { getMarketValidationError } from '@/utils/validateMarket';
import { getFuturesSpec, normalizeFuturesSymbol } from '@/constants/futuresSpecs';

interface AccountValidationContext {
  type?: AccountType | null;
  customSpecs?: CustomFuturesSpec[] | null;
}

/**
 * Validates a trade form before submission.
 * Returns an error message string if invalid, or null if valid.
 *
 * @param trade - The trade state to validate
 * @param hasCard - Function that checks if a strategy extra card is enabled
 * @param account - Optional account context. When `type === 'futures'`, the futures
 *                  branch enforces num_contracts > 0, sl_size > 0, and a resolvable
 *                  multiplier (hardcoded spec, custom spec, or per-trade override).
 */
export function validateTrade(
  trade: Trade,
  hasCard: (key: string) => boolean,
  account: AccountValidationContext = {},
): string | null {
  const isFutures = account.type === 'futures';
  const marketError = getMarketValidationError(trade.market);
  if (marketError) return marketError;

  if (!trade.direction || !trade.trade_outcome) {
    return 'Please select Direction and Trade Outcome.';
  }

  if (!trade.session || trade.session.trim() === '') {
    return 'Please select Session.';
  }

  if (!trade.trade_time || trade.trade_time.trim() === '') {
    return 'Please enter Trade Time.';
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trade.trade_time.trim())) {
    return 'Trade Time must be in HH:MM format (00:00–23:59).';
  }

  if (hasCard('setup_stats') && !trade.setup_type) {
    return 'Please fill in the Pattern / Setup field.';
  }

  if (hasCard('liquidity_stats') && !trade.liquidity) {
    return 'Please fill in the Conditions / Liquidity field.';
  }

  if (hasCard('mss_stats') && !trade.mss) {
    return 'Please fill in the MSS field.';
  }

  if (hasCard('evaluation_stats') && !trade.evaluation?.trim()) {
    return 'Please select Evaluation Grade.';
  }

  if (hasCard('trend_stats') && !trade.trend?.trim()) {
    return 'Please select Trend.';
  }

  if (hasCard('fvg_size') && (trade.fvg_size == null || trade.fvg_size === undefined)) {
    return 'Please fill in the FVG Size field.';
  }

  if (
    (hasCard('displacement_size') || hasCard('avg_displacement')) &&
    (trade.displacement_size == null || trade.displacement_size === undefined)
  ) {
    return 'Please fill in the Displacement Size (Points) field.';
  }

  if (hasCard('sl_size_stats') && (trade.sl_size == null || trade.sl_size === undefined)) {
    return 'Please fill in the SL Size field.';
  }

  // ── Futures-specific gates ──────────────────────────────────────────────
  if (isFutures) {
    if (trade.num_contracts == null || Number(trade.num_contracts) <= 0) {
      return 'Please enter the number of contracts.';
    }
    if (!Number.isFinite(Number(trade.num_contracts))) {
      return 'Number of contracts must be a valid positive number.';
    }
    if (!Number.isInteger(Number(trade.num_contracts))) {
      return 'Number of contracts must be a whole number (e.g. 1, 2, 3).';
    }
    if (trade.sl_size == null || Number(trade.sl_size) <= 0) {
      return 'Please enter the SL size in the contract\'s native units (points / ticks / cents).';
    }

    const symbol = normalizeFuturesSymbol(trade.market);
    const resolved = getFuturesSpec(symbol, account.customSpecs ?? null);
    if (!resolved) {
      const override = Number(trade.dollar_per_sl_unit_override);
      if (!Number.isFinite(override) || override <= 0) {
        return `No contract spec for "${symbol}". Save it as a custom symbol or enter a $ per SL-unit override.`;
      }
    }
  }

  if (!trade.strategy_id) {
    return 'Strategy not found. Please navigate to a valid strategy page.';
  }

  // Numeric validation (9A): catch NaN / non-finite values
  if (trade.risk_per_trade != null && (Number.isNaN(Number(trade.risk_per_trade)) || !Number.isFinite(Number(trade.risk_per_trade)))) {
    return 'Risk Per Trade must be a valid number.';
  }

  if (trade.risk_reward_ratio != null && (Number.isNaN(Number(trade.risk_reward_ratio)) || !Number.isFinite(Number(trade.risk_reward_ratio)))) {
    return 'Risk:Reward Ratio must be a valid number.';
  }

  if (trade.displacement_size != null && (Number.isNaN(Number(trade.displacement_size)) || !Number.isFinite(Number(trade.displacement_size)))) {
    return 'Displacement Size must be a valid number.';
  }

  if (trade.fvg_size != null && (Number.isNaN(Number(trade.fvg_size)) || !Number.isFinite(Number(trade.fvg_size)))) {
    return 'FVG Size must be a valid number.';
  }

  if (trade.sl_size != null && (Number.isNaN(Number(trade.sl_size)) || !Number.isFinite(Number(trade.sl_size)))) {
    return 'SL Size must be a valid number.';
  }

  return null;
}
