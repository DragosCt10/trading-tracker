import type { Trade } from '@/types/trade';
import { normalizeMarket } from '@/utils/validateMarket';
import { calculateTradePnl } from '@/utils/helpers/tradePnlCalculator';
import { tradeDateAndTimeToUtcISO } from '@/utils/tradeExecutedAt';
import { getIntervalForTime } from '@/constants/analytics';

/**
 * Builds the payload for creating a new trade.
 * Normalizes market, resolves Potential R:R defaults, computes P&L, and strips client-only fields.
 */
export function constructCreateTradePayload(
  trade: Trade,
  accountBalance: number,
): {
  tradePayload: Omit<Trade, 'id' | 'user_id' | 'account_id' | 'calculated_profit' | 'pnl_percentage'>;
  pnl_percentage: number;
  calculated_profit: number;
} {
  const normalizedMarket = normalizeMarket(trade.market);

  // When outcome is Win and user did not select Potential R:R, use the exact Risk:Reward Ratio
  const riskRewardRatioLong =
    trade.trade_outcome === 'Win' && (trade.risk_reward_ratio_long == null || trade.risk_reward_ratio_long === undefined)
      ? (Number(trade.risk_reward_ratio) || 0)
      : trade.risk_reward_ratio_long;

  const payload = {
    ...trade,
    market: normalizedMarket,
    risk_reward_ratio_long: riskRewardRatioLong,
    trade_executed_at: tradeDateAndTimeToUtcISO(trade.trade_date, trade.trade_time) ?? undefined,
  };

  const { id, user_id, account_id, calculated_profit, pnl_percentage, ...tradePayload } = payload;

  const { pnl_percentage: computedPnl, calculated_profit: computedProfit } =
    calculateTradePnl(trade, accountBalance);

  return { tradePayload, pnl_percentage: computedPnl, calculated_profit: computedProfit };
}

/**
 * Builds the update data object for editing an existing trade.
 * Normalizes market, resolves trade_executed_at, and maps all fields.
 */
export function constructUpdateTradePayload(
  editedTrade: Trade,
): Record<string, unknown> {
  const normalizedTradeTime = getIntervalForTime(editedTrade.trade_time || '')?.start ?? editedTrade.trade_time ?? '';

  return {
    trade_date: editedTrade.trade_date,
    trade_time: normalizedTradeTime,
    trade_executed_at: tradeDateAndTimeToUtcISO(editedTrade.trade_date, normalizedTradeTime) ?? null,
    day_of_week: editedTrade.day_of_week || '',
    quarter: editedTrade.quarter || '',
    market: normalizeMarket(editedTrade.market),
    direction: editedTrade.direction,
    setup_type: editedTrade.setup_type,
    liquidity: editedTrade.liquidity,
    sl_size: editedTrade.sl_size,
    displacement_size: editedTrade.displacement_size,
    risk_per_trade: editedTrade.risk_per_trade,
    trade_outcome: editedTrade.trade_outcome,
    session: editedTrade.session ?? '',
    risk_reward_ratio: editedTrade.risk_reward_ratio,
    risk_reward_ratio_long:
      editedTrade.trade_outcome === 'Lose' || editedTrade.trade_outcome === 'BE'
        ? 0
        : editedTrade.risk_reward_ratio_long,
    trade_screens: editedTrade.trade_screens,
    trade_screen_timeframes: editedTrade.trade_screen_timeframes,
    mss: editedTrade.mss,
    break_even: editedTrade.break_even,
    be_final_result: editedTrade.be_final_result,
    reentry: editedTrade.reentry,
    news_related: editedTrade.news_related,
    news_name: editedTrade.news_related ? (editedTrade.news_name ?? null) : null,
    news_intensity: editedTrade.news_related ? (editedTrade.news_intensity ?? null) : null,
    local_high_low: editedTrade.local_high_low,
    notes: editedTrade.notes,
    pnl_percentage: editedTrade.pnl_percentage,
    calculated_profit: editedTrade.calculated_profit,
    evaluation: editedTrade.evaluation,
    partials_taken: editedTrade.partials_taken,
    executed: editedTrade.executed,
    launch_hour: editedTrade.launch_hour,
    strategy_id: editedTrade.strategy_id,
    trend: editedTrade.trend ?? null,
    fvg_size: editedTrade.fvg_size ?? null,
    confidence_at_entry: editedTrade.confidence_at_entry ?? null,
    mind_state_at_entry: editedTrade.mind_state_at_entry ?? null,
    tags: (editedTrade.tags ?? []).map((t: string) => t.toLowerCase().trim()).filter(Boolean),
  };
}
