import { getIntervalForTime, TIME_INTERVALS } from '@/constants/analytics';
import type { Trade } from '@/types/trade';
import type { CustomStatFilter } from '@/types/customStats';

/** Returns human-readable pill labels for a CustomStatFilter. */
export function buildFilterPills(filters: CustomStatFilter): string[] {
  const pills: string[] = [];
  if (filters.direction) pills.push(filters.direction);
  if (filters.market) pills.push(filters.market);
  if (filters.trade_time) {
    const interval = TIME_INTERVALS.find((i) => i.start === filters.trade_time);
    pills.push(interval ? interval.label : filters.trade_time);
  }
  if (filters.trade_outcome) pills.push(filters.trade_outcome);
  if (filters.day_of_week) pills.push(filters.day_of_week);
  if (filters.quarter) pills.push(filters.quarter);
  if (filters.news_related !== undefined) pills.push(filters.news_related ? 'News' : 'No News');
  if (filters.reentry !== undefined) pills.push(filters.reentry ? 'Re-entry' : 'No Re-entry');
  if (filters.partials_taken !== undefined) pills.push(filters.partials_taken ? 'Partials' : 'No Partials');
  if (filters.executed !== undefined) pills.push(filters.executed ? 'Executed' : 'Not Executed');
  if (filters.confidence_at_entry !== undefined) pills.push(`Conf: ${filters.confidence_at_entry}`);
  if (filters.mind_state_at_entry !== undefined) pills.push(`Mind: ${filters.mind_state_at_entry}`);
  if (filters.setup_type) pills.push(filters.setup_type);
  if (filters.liquidity) pills.push(filters.liquidity);
  if (filters.mss) pills.push(`MSS: ${filters.mss}`);
  if (filters.session) pills.push(filters.session);
  if (filters.evaluation) pills.push(filters.evaluation);
  if (filters.trend) pills.push(filters.trend);
  if (filters.local_high_low !== undefined) pills.push(filters.local_high_low ? 'Local H/L' : 'No Local H/L');
  if (filters.launch_hour !== undefined) pills.push(filters.launch_hour ? 'Launch Hour' : 'No Launch Hour');
  if (filters.fvg_size !== undefined) pills.push(`FVG: ${filters.fvg_size}`);
  if (filters.tags?.length) {
    filters.tags.forEach((t) => {
      pills.push(t.length > 20 ? t.slice(0, 19) + '…' : t);
    });
  }
  return pills;
}

/**
 * Filters a list of trades by a CustomStatFilter.
 * Undefined filter keys mean "any" — they are skipped.
 */
export function applyCustomStatFilter(trades: Trade[], filter: CustomStatFilter): Trade[] {
  return trades.filter((trade) => {
    if (filter.direction !== undefined && trade.direction !== filter.direction) return false;
    if (filter.market !== undefined && trade.market !== filter.market) return false;
    if (filter.trade_time !== undefined) {
      const interval = getIntervalForTime(trade.trade_time);
      if (interval?.start !== filter.trade_time) return false;
    }
    if (filter.trade_outcome !== undefined) {
      if (filter.trade_outcome === 'BE') {
        if (!trade.break_even) return false;
      } else {
        if (trade.break_even || trade.trade_outcome !== filter.trade_outcome) return false;
      }
    }
    if (filter.day_of_week !== undefined && trade.day_of_week !== filter.day_of_week) return false;
    if (filter.quarter !== undefined && trade.quarter !== filter.quarter) return false;
    if (filter.news_related !== undefined && trade.news_related !== filter.news_related) return false;
    if (filter.reentry !== undefined && trade.reentry !== filter.reentry) return false;
    if (filter.partials_taken !== undefined && trade.partials_taken !== filter.partials_taken) return false;
    if (filter.executed !== undefined && trade.executed !== filter.executed) return false;
    if (filter.confidence_at_entry !== undefined && trade.confidence_at_entry !== filter.confidence_at_entry) return false;
    if (filter.mind_state_at_entry !== undefined && trade.mind_state_at_entry !== filter.mind_state_at_entry) return false;
    if (filter.setup_type !== undefined && trade.setup_type !== filter.setup_type) return false;
    if (filter.liquidity !== undefined && trade.liquidity !== filter.liquidity) return false;
    if (filter.mss !== undefined && trade.mss !== filter.mss) return false;
    if (filter.session !== undefined && trade.session !== filter.session) return false;
    if (filter.evaluation !== undefined && trade.evaluation !== filter.evaluation) return false;
    if (filter.trend !== undefined && trade.trend !== filter.trend) return false;
    if (filter.local_high_low !== undefined && trade.local_high_low !== filter.local_high_low) return false;
    if (filter.launch_hour !== undefined && trade.launch_hour !== filter.launch_hour) return false;
    if (filter.fvg_size !== undefined && trade.fvg_size !== filter.fvg_size) return false;
    if (filter.tags?.length) {
      if (!filter.tags.some((t) => trade.tags?.includes(t))) return false;
    }
    return true;
  });
}
