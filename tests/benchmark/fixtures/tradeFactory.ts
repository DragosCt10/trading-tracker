/**
 * Synthetic Trade generator for performance benchmarks and load tests.
 *
 * Produces Trade[] with realistic distributions:
 *   - 60% Win / 25% Lose / 15% BE
 *   - 70% Long / 30% Short
 *   - risk_per_trade: 0.25–1% (DEFAULT_RISK_PCT centred at 0.5%)
 *   - trade_date: spread over last 2 years
 *   - mode: 'backtesting' (safe — never mixed with real trade data)
 *
 * Two variants:
 *   generateTrades(n)                     — realistic distributions (5 markets, 5 setups)
 *   generateTrades(n, { diverse: true })  — max category diversity (20+ markets, 50+ setups)
 *                                           stresses calculateCategoryStats O(n×m) factor
 *
 * Usage:
 *   import { generateTrades } from './tradeFactory';
 *   const trades = generateTrades(30_000);
 */

import type { Trade } from '../../../src/types/trade';

// --- Pools ---------------------------------------------------------------

const MARKETS_NORMAL = [
  'EURUSD', 'GBPUSD', 'NAS100', 'BTCUSD', 'XAUUSD',
];

const MARKETS_DIVERSE = [
  // Forex
  'EURUSD', 'GBPUSD', 'AUDUSD', 'USDJPY', 'USDCHF', 'NZDUSD', 'USDCAD',
  'EURGBP', 'EURJPY', 'GBPJPY', 'AUDNZD', 'CADCHF', 'CHFJPY', 'AUDCAD',
  // Indices
  'NAS100', 'US30', 'SPX500', 'GER40', 'UK100', 'JP225', 'AU200',
  // Crypto
  'BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'ADAUSD',
  // Commodities
  'XAUUSD', 'XAGUSD', 'USOIL', 'BRENT', 'NATGAS',
  // Futures
  'ES', 'NQ', 'YM', 'RTY', 'CL', 'GC',
];

const SETUPS_NORMAL = ['BOS', 'CHoCH', 'FVG', 'OB', 'LIQ'];

/** 50+ unique setup names for O(n×m) stress testing */
const SETUPS_DIVERSE = Array.from({ length: 52 }, (_, i) => `Setup-${String.fromCharCode(65 + (i % 26))}-${Math.floor(i / 26) + 1}`);

const SESSIONS = ['New York', 'London', 'Tokyo', 'Sydney'] as const;
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const INTERVALS = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'] as const;
const EVALUATIONS = ['A+', 'A', 'B', 'C', 'Not Evaluated'] as const;
const MSS_VALUES = ['Bullish', 'Bearish', 'None'] as const;
const TRENDS = ['Bullish', 'Bearish', 'Ranging', null] as const;
const FVG_SIZES = [1, 1.5, 2, 2.5, null] as const;
const RISK_LEVELS = [0.25, 0.3, 0.5, 0.5, 0.5, 0.7, 1] as const; // weighted toward 0.5

// --- Helpers -------------------------------------------------------------

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Seed-able LCG for deterministic output in benchmarks (optional) */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

/** ISO date string N days before today, at random offset */
function randomDate(maxDaysAgo = 730): string {
  const ms = Date.now() - Math.floor(Math.random() * maxDaysAgo * 86_400_000);
  return new Date(ms).toISOString().slice(0, 10);
}

function randomTime(): string {
  const h = String(Math.floor(Math.random() * 24)).padStart(2, '0');
  const m = String(Math.floor(Math.random() * 60)).padStart(2, '0');
  return `${h}:${m}`;
}

// --- Main generator -------------------------------------------------------

export interface GenerateOptions {
  /** If true, use 20+ markets and 50+ setups to stress O(n×m) category stats. */
  diverse?: boolean;
  /** Stable seed for deterministic output. Default: random. */
  seed?: number;
}

/**
 * Generate `count` synthetic Trade objects.
 *
 * All fields match the canonical Trade interface from src/types/trade.ts.
 * Generated trades are safe to pass directly to any calculate*.ts function.
 */
export function generateTrades(count: number, opts: GenerateOptions = {}): Trade[] {
  const markets  = opts.diverse ? MARKETS_DIVERSE  : MARKETS_NORMAL;
  const setups   = opts.diverse ? SETUPS_DIVERSE   : SETUPS_NORMAL;
  const rand     = opts.seed !== undefined ? seededRand(opts.seed) : Math.random.bind(Math);

  const trades: Trade[] = [];

  const STABLE_USER_ID     = 'perf-test-user-00000000-0000';
  const STABLE_ACCOUNT_ID  = 'perf-test-account-00000000-0000';
  const STABLE_STRATEGY_ID = 'perf-test-strategy-00000000-0000';

  for (let i = 0; i < count; i++) {
    const r = rand();

    // Outcome: 60% Win, 25% Lose, 15% BE
    let trade_outcome: string;
    let break_even: boolean;
    let be_final_result: string | null = null;

    if (r < 0.60) {
      trade_outcome = 'Win';
      break_even = false;
    } else if (r < 0.85) {
      trade_outcome = 'Lose';
      break_even = false;
    } else {
      trade_outcome = 'BE';
      break_even = true;
      be_final_result = rand() > 0.5 ? 'Win' : 'Lose';
    }

    const direction = rand() < 0.70 ? 'Long' : 'Short';
    const risk_per_trade = RISK_LEVELS[Math.floor(rand() * RISK_LEVELS.length)];
    const risk_reward_ratio = Math.round((1 + rand() * 4) * 10) / 10; // 1.0–5.0
    const trade_date = randomDate(730);
    const tradeTime = randomTime();

    // calculated_profit: wins = +RR × risk%, losses = -risk%, BE ≈ 0
    let calculated_profit: number;
    if (trade_outcome === 'Win') {
      calculated_profit = risk_per_trade * risk_reward_ratio;
    } else if (trade_outcome === 'Lose') {
      calculated_profit = -risk_per_trade;
    } else {
      calculated_profit = 0;
    }

    const pnl_percentage = calculated_profit;

    trades.push({
      id: `perf-${i}`,
      user_id: STABLE_USER_ID,
      account_id: STABLE_ACCOUNT_ID,
      strategy_id: STABLE_STRATEGY_ID,
      mode: 'backtesting',

      // Required fields from Trade interface
      trade_screens: [],
      trade_screen_timeframes: [],
      trade_time: tradeTime,
      trade_date,
      day_of_week: pick(DAYS_OF_WEEK),
      market: pick(markets),
      setup_type: pick(setups),
      liquidity: rand() > 0.5 ? 'SSL' : 'BSL',
      sl_size: Math.round(rand() * 50 + 5) / 10, // 0.5–5.5
      direction,
      trade_outcome,
      session: pick(SESSIONS),
      be_final_result,
      break_even,
      reentry: rand() < 0.1,
      news_related: rand() < 0.15,
      news_name: null,
      news_intensity: null,
      mss: pick(MSS_VALUES),
      risk_reward_ratio,
      risk_reward_ratio_long: risk_reward_ratio,
      local_high_low: rand() < 0.2,
      risk_per_trade,
      calculated_profit,
      notes: undefined,
      pnl_percentage,
      quarter: `Q${Math.ceil((new Date(trade_date).getMonth() + 1) / 3)}`,
      evaluation: pick(EVALUATIONS),
      partials_taken: rand() < 0.3,
      executed: true,
      launch_hour: rand() < 0.05,
      displacement_size: Math.round(rand() * 20 + 5),
      trend: pick(TRENDS),
      fvg_size: pick(FVG_SIZES),
      confidence_at_entry: Math.ceil(rand() * 5) as 1 | 2 | 3 | 4 | 5,
      mind_state_at_entry: Math.ceil(rand() * 5) as 1 | 2 | 3 | 4 | 5,
      trade_executed_at: `${trade_date}T${tradeTime}:00Z`,
    });
  }

  return trades;
}
