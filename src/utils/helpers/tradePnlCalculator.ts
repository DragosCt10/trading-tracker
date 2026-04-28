import type { Trade } from '@/types/trade';
import type { AccountType, CustomFuturesSpec } from '@/types/account-settings';
import { getFuturesSpec, type SpecSource } from '@/constants/futuresSpecs';

/**
 * Thrown when a futures trade can't compute risk because no spec is found and no
 * per-trade override was provided. Caught at the form layer to surface an inline
 * validation error before the trade is persisted (prevents NaN in the DB).
 */
export class MissingFuturesSpecError extends Error {
  constructor(public readonly market: string) {
    super(
      `Cannot save futures trade: no contract spec found for ${market || '(empty)'}. ` +
        'Add a custom symbol or enter a $ per SL-unit override.',
    );
    this.name = 'MissingFuturesSpecError';
  }
}

export interface TradePnlResult {
  pnl_percentage: number;
  calculated_profit: number;
  /** Dollar risk snapshot, only populated for futures trades. */
  calculated_risk_dollars: number | null;
  /** Provenance of the multiplier used (futures only). */
  spec_source: SpecSource | null;
}

/**
 * Compute P&L for a trade. Branches on the parent account's `type`:
 *   - `'standard'` (default) → existing risk × R:R × balance formula.
 *   - `'futures'` → contracts × sl × $/SL-unit × R:R.
 *
 * Pure function. Safe to call in a tight loop. For futures trades, the resolver tries
 * hardcoded specs first, then user-saved custom specs, then `dollar_per_sl_unit_override`.
 * Throws `MissingFuturesSpecError` if all three miss — caller must catch.
 *
 * The `account` arg accepts a bare `number` (legacy/standard, balance only) OR
 * `{ balance, type }` (preferred). The bare-number form is preserved so existing
 * call sites in NewTradeModal/TradeDetailsPanel keep compiling — they get the
 * standard P&L path. Futures trades require the object form.
 */
export function calculateTradePnl(
  trade: Pick<Trade, 'trade_outcome' | 'risk_per_trade' | 'risk_reward_ratio' | 'break_even'> &
    Partial<
      Pick<
        Trade,
        | 'partials_taken'
        | 'market'
        | 'sl_size'
        | 'num_contracts'
        | 'dollar_per_sl_unit_override'
      >
    >,
  account: number | { balance: number; type?: AccountType | null },
  customSpecs?: CustomFuturesSpec[] | null,
): TradePnlResult {
  const balance = typeof account === 'number' ? Number(account) || 0 : Number(account.balance) || 0;
  const accountType: AccountType | null | undefined =
    typeof account === 'number' ? undefined : account.type;
  const isFutures = accountType === 'futures';

  if (!isFutures) {
    // Standard path — preserved behavior.
    if (!balance || trade.break_even) {
      return {
        pnl_percentage: 0,
        calculated_profit: 0,
        calculated_risk_dollars: null,
        spec_source: null,
      };
    }
    const risk = Number(trade.risk_per_trade) || 0;
    const rr = Number(trade.risk_reward_ratio) || 0;
    const pnlPct = trade.trade_outcome === 'Lose' ? -risk : risk * rr;
    return {
      pnl_percentage: pnlPct,
      calculated_profit: (pnlPct / 100) * balance,
      calculated_risk_dollars: null,
      spec_source: null,
    };
  }

  // Futures path.
  const numContracts = Number(trade.num_contracts) || 0;
  const slSize = Number(trade.sl_size) || 0;
  const rr = Number(trade.risk_reward_ratio) || 0;

  // Zero inputs → zero everything (no spec lookup needed; live preview handles "—" UX).
  if (numContracts <= 0 || slSize <= 0) {
    return {
      pnl_percentage: 0,
      calculated_profit: 0,
      calculated_risk_dollars: 0,
      spec_source: null,
    };
  }

  // Resolve multiplier via 3-tier lookup. Throw if all three miss — caller must catch.
  const resolved = getFuturesSpec(trade.market, customSpecs);
  let multiplier: number;
  let specSource: SpecSource;
  if (resolved) {
    multiplier = resolved.spec.dollarPerSlUnit;
    specSource = resolved.source;
  } else {
    const override = Number(trade.dollar_per_sl_unit_override) || 0;
    if (override <= 0) {
      throw new MissingFuturesSpecError(trade.market ?? '');
    }
    multiplier = override;
    specSource = 'override';
  }

  const riskDollars = numContracts * slSize * multiplier;

  // BE without partials → 0. BE with partials → treated as a win (mirrors calculateMacroStats).
  // Lose → -risk. Otherwise (Win, or BE+partials) → +risk × RR.
  let pnlDollars: number;
  if (trade.break_even && !trade.partials_taken) {
    pnlDollars = 0;
  } else if (trade.trade_outcome === 'Lose') {
    pnlDollars = -riskDollars;
  } else {
    pnlDollars = riskDollars * rr;
  }

  const pnlPct = balance > 0 ? (pnlDollars / balance) * 100 : 0;

  return {
    pnl_percentage: pnlPct,
    calculated_profit: pnlDollars,
    calculated_risk_dollars: riskDollars,
    spec_source: specSource,
  };
}
