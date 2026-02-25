import type { Trade } from '@/types/trade';

/** Reference to a trade: id is the trade UUID, mode is the table (live/demo/backtesting) */
export type TradeRef = { id: string; mode: 'live' | 'backtesting' | 'demo' };

export interface Note {
  id: string;
  user_id: string;
  strategy_id: string | null; // Keep for backward compatibility
  strategy_ids?: string[]; // Array of strategy IDs for multiple strategies
  title: string;
  content: string; // Markdown content
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
  tags?: string[];
  /** Link insight to specific trades (from one or more strategies) */
  trade_refs?: TradeRef[];
  // Joined data (optional, when fetched with strategy/strategies)
  strategy?: {
    id: string;
    name: string;
    slug: string;
  };
  strategies?: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  /** Resolved trade summaries when note has trade_refs (for display in NoteDetailsModal etc.) */
  trades?: Array<{
    id: string;
    mode: string;
    trade_date: string;
    market: string;
    direction: string;
    trade_outcome: string;
    strategy_name?: string;
  }>;
  /** Full Trade rows for linked trades (from list fetch). Use for hover list + modal without extra fetch. */
  linkedTradesFull?: Trade[];
}
