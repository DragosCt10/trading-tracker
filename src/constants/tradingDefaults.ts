/**
 * Fallback values used when trade fields are null/undefined.
 * Centralised here so calculations stay consistent across all utils.
 */

/** Default risk % per trade when risk_per_trade is null. */
export const DEFAULT_RISK_PCT = 0.5;

/** Default R:R ratio when risk_reward_ratio is null. */
export const DEFAULT_RR = 2;

/** Risk threshold levels used in RiskPerTrade analysis. */
export const RISK_LEVELS = [0.25, 0.3, 0.35, 0.5, 0.7, 1] as const;

/** Min/max length for a valid market symbol. */
export const MARKET_MIN_LENGTH = 2;
export const MARKET_MAX_LENGTH = 10;
