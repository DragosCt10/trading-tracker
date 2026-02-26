/**
 * Local fuzzy column matcher for CSV → DB field mapping.
 * No external dependencies — uses an inline Levenshtein ratio.
 * Scores 0-100; matches above `threshold` (default 75) are accepted.
 *
 * Usage:
 *   const matches = matchHeaders(csvHeaders);            // fuzzy auto-match
 *   const fieldMapping = toFieldMapping(matches);        // ready for parseCsvTradesWithNorm()
 */

// ─── Schema definition ──────────────────────────────────────────────────────

export interface SchemaField {
  key: string;
  label: string;
  synonyms: string[];
  required: boolean;
  valueType: 'string' | 'number' | 'boolean' | 'date' | 'time';
  description: string;
}

/**
 * Complete DB schema for the trading-tracker `*_trades` tables.
 * Each `synonyms` array covers common CSV header variants from MT5 / manual journals.
 */
export const DB_SCHEMA: SchemaField[] = [
  // ── Required ────────────────────────────────────────────────────────────
  {
    key: 'trade_date',
    label: 'Trade Date',
    synonyms: [
      'trade_date', 'date', 'open date', 'close date', 'deal date',
      'trade day', 'entry date', 'open_date', 'close_date', 'deal_date',
      'tradedate', 'opendate', 'closedate',
      // MT4/MT5 history exports
      'datetime', 'trade datetime', 'open datetime',
      // Generic journal variants
      'execution date', 'filled date', 'transaction date',
      'day traded', 'date traded',
    ],
    required: true,
    valueType: 'date',
    description: 'Date the trade was opened (any format)',
  },
  {
    key: 'trade_time',
    label: 'Trade Time',
    synonyms: [
      'trade_time', 'time', 'open time', 'entry time', 'close time',
      'timestamp', 'open_time', 'entry_time', 'hour', 'tradetime',
      'opentime', 'closetime',
      // Common variants
      'close_time', 'fill time', 'execution time', 'trade timestamp',
      'time of entry', 'time entered', 'entry hour',
    ],
    required: true,
    valueType: 'time',
    description: 'Trade entry time (HH:mm or HH:mm:ss)',
  },
  {
    key: 'market',
    label: 'Market / Symbol',
    synonyms: [
      'market', 'symbol', 'pair', 'instrument', 'asset', 'ticker',
      'sym', 'currency pair', 'security', 'product', 'contract',
      'currency_pair', 'currencypair', 'ccy', 'fx pair',
      // Additional real-world variants
      'trade symbol', 'trading pair', 'underlying', 'commodity',
      'index', 'stock', 'equity', 'crypto', 'coin',
      'cross', 'fx cross', 'name', 'code',
      // Compound headers (e.g. "Pair/Indices", "Symbol/Pair")
      'pair indices', 'pair/indices', 'pairs indices', 'symbol pair',
      'pair symbol', 'symbol/pair', 'market symbol', 'instrument name',
    ],
    required: true,
    valueType: 'string',
    description: 'Trading symbol e.g. EURUSD, XAUUSD',
  },
  {
    key: 'direction',
    label: 'Direction',
    synonyms: [
      'direction', 'type', 'side', 'order type', 'trade type', 'action',
      'buy sell', 'long short', 'position', 'operation', 'order_type',
      'trade_type', 'buy/sell', 'b/s', 'buysell',
      // MT4/MT5 deal exports + journal variants
      'cmd', 'deal type', 'pos type', 'position type', 'pos_type',
      'trade direction', 'entry direction', 'order side',
      'long or short', 'buy or sell',
    ],
    required: true,
    valueType: 'string',
    description: 'Long or Short (buy/sell)',
  },
  {
    key: 'trade_outcome',
    label: 'Trade Outcome',
    synonyms: [
      'trade_outcome', 'outcome', 'result', 'win', 'loss', 'win loss',
      'status', 'trade result', 'pnl result', 'win/loss', 'w/l',
      'tradeoutcome', 'winloss', 'win_loss',
      // More journal variants
      'verdict', 'trade status', 'success', 'profit loss result',
      'hit sl', 'hit tp', 'closed result', 'p/l result',
    ],
    required: true,
    valueType: 'string',
    description: 'Win or Lose',
  },
  {
    key: 'risk_per_trade',
    label: 'Risk Per Trade (%)',
    synonyms: [
      'risk_per_trade', 'risk', 'risk percent', 'risk pct', 'risk %',
      '% risk', 'r', 'risk amount', 'position risk', 'risk per trade',
      'riskpct', 'risk_pct', 'risk_%', '%_risk',
      // More variants
      'risk percentage', 'account risk', 'capital at risk',
      'risked', 'max risk', 'stake', '%risk', 'risk size',
    ],
    required: true,
    valueType: 'number',
    description: 'Risk percentage per trade (e.g. 1 = 1%)',
  },
  {
    key: 'risk_reward_ratio',
    label: 'Risk/Reward Ratio',
    synonyms: [
      'risk_reward_ratio', 'rr', 'r r', 'rr ratio', 'risk reward',
      'reward risk', 'r:r', 'risk to reward', 'tp sl ratio', 'risk/reward',
      'rr_ratio', 'r_r', 'rrr',
      // More variants
      'planned rr', 'intended rr', 'setup rr', 'initial rr',
      'reward to risk', 'r2r', 'rr setup', 'r/r',
      // R-multiple (planned) variants
      'rr multiple', 'rr-multiple', 'r multiple', 'r-multiple', 'rmultiple',
      'rr_multiple', 'r_multiple',
    ],
    required: true,
    valueType: 'number',
    description: 'Risk to reward ratio (e.g. 2.0 = 1:2)',
  },

  // ── Optional – numeric ───────────────────────────────────────────────────
  //
  // NOTE: calculated_profit and pnl_percentage are intentionally excluded.
  // When risk_per_trade + risk_reward_ratio are mapped, both are derived
  // automatically via calculateTradePnl() using the account balance:
  //   Win:  pnl_pct = risk * RR  →  profit = (pnl_pct / 100) * balance
  //   Lose: pnl_pct = -risk      →  profit = (pnl_pct / 100) * balance
  {
    key: 'sl_size',
    label: 'Stop Loss Size',
    synonyms: [
      'sl_size', 'sl', 'stop loss', 'stoploss', 'sl pips', 'stop pips',
      's/l', 'sl distance', 'stop_loss', 'slsize', 'sl_pips',
      // More variants
      'stop loss pips', 'stop loss size', 'sl size pips', 'sl points',
      'stop distance', 'stop points', 'sl pts', 'pips sl',
      'stop in pips', 'slp',
    ],
    required: false,
    valueType: 'number',
    description: 'Stop loss size in pips',
  },
  {
    key: 'risk_reward_ratio_long',
    label: 'Potential R:R',
    synonyms: [
      'risk_reward_ratio_long', 'actual rr', 'achieved rr', 'final rr',
      'realised rr', 'actual risk reward', 'target rr', 'max rr',
      'achieved_rr', 'actual_rr',
      // American spelling + more
      'realized rr', 'result rr', 'exit rr', 'closed rr',
      'final risk reward', 'actual r r',
      // Potential variants (matches "RR Potential", "Potential R:R", etc.)
      'potential rr', 'rr potential', 'potential r r', 'potential risk reward',
      'potential_rr', 'rr_potential',
    ],
    required: false,
    valueType: 'number',
    description: 'Actual risk/reward ratio achieved',
  },
  {
    key: 'displacement_size',
    label: 'Displacement Size',
    synonyms: [
      'displacement_size', 'displacement', 'impulse', 'impulse size',
      'move size', 'displacementsize',
      // More variants
      'candle size', 'displacement pips', 'disp', 'disp size',
      'move pips', 'displacement move',
    ],
    required: false,
    valueType: 'number',
    description: 'Displacement/impulse move size in pips',
  },
  {
    key: 'fvg_size',
    label: 'FVG Size',
    synonyms: [
      'fvg_size', 'fvg', 'fair value gap', 'gap size', 'imbalance size',
      'fvgsize',
      // ICT / SMC terminology
      'imbalance', 'imb', 'imb size', 'void size', 'price gap',
      'fvg pips', 'inefficiency', 'liquidity void',
    ],
    required: false,
    valueType: 'number',
    description: 'Fair Value Gap size in pips',
  },
  {
    key: 'confidence_at_entry',
    label: 'Confidence at Entry',
    synonyms: [
      'confidence_at_entry', 'confidence', 'conviction', 'entry confidence',
      'certainty', 'conf',
      // More variants
      'entry conviction', 'confidence score', 'confidence level',
      'rating at entry', 'trade confidence', 'mental clarity',
    ],
    required: false,
    valueType: 'number',
    description: 'Confidence level at entry (1-10)',
  },
  {
    key: 'mind_state_at_entry',
    label: 'Mind State at Entry',
    synonyms: [
      'mind_state_at_entry', 'mind state', 'psychology', 'mental state',
      'emotional state', 'focus', 'mindstate',
      // More variants
      'mindset', 'emotion', 'emotions', 'mood', 'mental',
      'mental score', 'psychology score', 'focus level',
      'state of mind', 'mental status',
    ],
    required: false,
    valueType: 'number',
    description: 'Mental state at entry (1-10)',
  },

  // ── Optional – string ────────────────────────────────────────────────────
  {
    key: 'setup_type',
    label: 'Setup Type',
    synonyms: [
      'setup_type', 'setup', 'pattern', 'strategy', 'trade setup',
      'entry model', 'model', 'setup name', 'signal', 'setuptype',
      // More variants
      'trade pattern', 'entry type', 'trade model', 'system',
      'confluence', 'reason', 'entry reason', 'trade reason',
      'trigger', 'entry trigger', 'why',
    ],
    required: false,
    valueType: 'string',
    description: 'Trading setup or pattern used',
  },
  {
    key: 'liquidity',
    label: 'Liquidity',
    synonyms: [
      'liquidity', 'liquidity type', 'liq', 'structure', 'liquidity level',
      'liq_type',
      // ICT / SMC terminology
      'pool', 'liquidity pool', 'target liquidity', 'liq target',
      'buy side', 'sell side', 'bsl', 'ssl',
    ],
    required: false,
    valueType: 'string',
    description: 'Liquidity level targeted',
  },
  {
    key: 'liquidity_taken',
    label: 'Liquidity Taken',
    synonyms: [
      'liquidity_taken', 'liq taken', 'taken liquidity', 'sweep',
      'liquidity swept', 'liquiditytaken',
      // More variants
      'swept', 'bsl taken', 'ssl taken', 'liquidity grab',
      'stop hunt', 'equal highs', 'equal lows',
      'prev high low', 'previous high low',
    ],
    required: false,
    valueType: 'string',
    description: 'Which liquidity level was swept',
  },
  {
    key: 'mss',
    label: 'MSS',
    synonyms: [
      'mss', 'market structure', 'structure shift', 'choch', 'bos',
      'break of structure', 'market_structure',
      // ICT / SMC terminology
      'change of character', 'choch bos', 'market shift',
      'structure break', 'market structure shift', 'bos choch',
    ],
    required: false,
    valueType: 'string',
    description: 'Market structure shift type',
  },
  {
    key: 'evaluation',
    label: 'Evaluation',
    synonyms: [
      'evaluation', 'grade', 'score', 'quality', 'trade quality', 'rating',
      'review',
      // More variants
      'mark', 'feedback', 'trade grade', 'trade score', 'trade rating',
      'execution quality', 'execution score', 'self assessment',
      'performance',
    ],
    required: false,
    valueType: 'string',
    description: 'Trade quality evaluation (A+, A, B, C)',
  },
  {
    key: 'trend',
    label: 'Trend',
    synonyms: [
      'trend', 'market trend', 'bias', 'directional bias', 'overall trend',
      'htf bias', 'htf_bias',
      // More variants
      'market bias', 'higher tf bias', 'higher timeframe bias',
      'macro trend', 'daily bias', 'weekly bias', 'trend direction',
      'bullish bearish', 'htf trend',
    ],
    required: false,
    valueType: 'string',
    description: 'Overall market trend (Bullish/Bearish)',
  },
  {
    key: 'trade_link',
    label: 'Trade Link',
    synonyms: [
      'trade_link', 'link', 'chart', 'chart link', 'screenshot',
      'tradingview', 'image', 'url', 'tradelink',
      // More variants
      'chart url', 'tv link', 'photo', 'image link', 'chart screenshot',
      'tv', 'reference', 'analysis link', 'ref',
    ],
    required: false,
    valueType: 'string',
    description: 'URL to chart screenshot',
  },
  {
    key: 'notes',
    label: 'Notes',
    synonyms: [
      'notes', 'comment', 'comments', 'memo', 'description', 'remarks',
      'annotation', 'observations', 'note',
      // More variants
      'thoughts', 'journal', 'journal notes', 'trade notes',
      'reflection', 'post trade', 'post trade notes',
      'analysis', 'details', 'summary',
    ],
    required: false,
    valueType: 'string',
    description: 'Trade notes or observations',
  },

  // ── Optional – boolean ───────────────────────────────────────────────────
  {
    key: 'break_even',
    label: 'Break Even',
    synonyms: [
      'break_even', 'be', 'breakeven', 'moved to be', 'be hit',
      'break even hit', 'break_even_hit',
      // More variants
      'be moved', 'moved be', 'sl moved to be', 'stop to be',
      'to breakeven', 'be activated', 'be trigger',
    ],
    required: false,
    valueType: 'boolean',
    description: 'Did trade hit break even?',
  },
  {
    key: 'reentry',
    label: 'Re-entry',
    synonyms: [
      'reentry', 're_entry', 'reenter', 'second entry', 'retry',
      're trade', 're-entry',
      // More variants
      '2nd entry', 'entry 2', 'additional entry',
      'rebuy', 'resell',
    ],
    required: false,
    valueType: 'boolean',
    description: 'Was this a re-entry trade?',
  },
  {
    key: 'news_related',
    label: 'News Related',
    synonyms: [
      'news_related', 'news', 'fundamental', 'event', 'catalyst',
      'news trade', 'high impact', 'newsrelated',
      // More variants
      'news event', 'economic event', 'economic news',
      'high impact news', 'news driven', 'around news', 'near news',
      'fomc', 'nfp', 'cpi',
    ],
    required: false,
    valueType: 'boolean',
    description: 'Was this trade influenced by news?',
  },
  {
    key: 'local_high_low',
    label: 'Local High/Low',
    synonyms: [
      'local_high_low', 'local hl', 'swing hl', 'local swing',
      'swing point', 'prev high low', 'localhighlow',
      // More variants
      'local level', 'swing high low', 'local highs lows',
      'previous high low', 'recent hl', 'local structure',
    ],
    required: false,
    valueType: 'boolean',
    description: 'Did trade respect local high/low?',
  },
  {
    key: 'partials_taken',
    label: 'Partials Taken',
    synonyms: [
      'partials_taken', 'partials', 'partial tp', 'partial close',
      'scaled out', 'partial exit', 'partialstaken',
      // More variants
      'scaled', 'tp1', 'partial profit', 'partial profits',
      'took partials', 'reduce position', 'runner',
    ],
    required: false,
    valueType: 'boolean',
    description: 'Were partial profits taken?',
  },
  {
    key: 'executed',
    label: 'Executed',
    synonyms: [
      'executed', 'taken', 'entered', 'traded', 'trade taken',
      'live', 'is_executed',
      // More variants
      'filled', 'placed', 'active', 'trade placed', 'trade executed',
      'is live',
    ],
    required: false,
    valueType: 'boolean',
    description: 'Was the trade actually executed?',
  },
  {
    key: 'launch_hour',
    label: 'Launch Hour',
    synonyms: [
      'launch_hour', 'session', 'trading session', 'session open',
      'london open', 'ny open', 'killzone', 'launchhour',
      // Session variants
      'asian session', 'london session', 'new york session', 'ny session',
      'am session', 'pm session', 'overlap', 'open', 'macros',
      'killzone session',
    ],
    required: false,
    valueType: 'boolean',
    description: 'Was trade taken during launch hour/killzone?',
  },
];

// ─── Fuzzy matching via fuzzball ──────────────────────────────────────────────
//
// fuzzball.token_set_ratio is used because it:
//   1. Handles word reordering:  "trade outcome" ↔ "outcome trade"     → 100
//   2. Handles partial overlap:  "% Risk"        ↔ "risk per trade"    → high
//   3. Handles abbreviations:    "rr"            ↔ "risk reward ratio" → decent
//   4. full_process:true strips emoji, punctuation, collapses whitespace
//      so "GBP/USD 🇬🇧" and "gbpusd" both reduce to comparable tokens.

import * as fuzz from 'fuzzball';

const FUZZ_OPTIONS = { full_process: true } as const;

/** Score a CSV header against a single synonym using fuzzball. Returns 0–100.
 *
 * `token_set_ratio` gives 100 whenever the shorter string's tokens are a
 * subset of the longer string's tokens, regardless of length — e.g. "rr"
 * scores 100 against "rr potential" because "rr" is contained in it.
 * We apply a length-coverage multiplier to penalise short synonyms matching
 * much longer headers (or vice-versa), so "rr" (len 2) no longer wins over
 * "rr potential" (len 11) when both claim 100 raw score.
 */
function scoreSynonym(csvHeader: string, synonym: string): number {
  const raw = fuzz.token_set_ratio(csvHeader, synonym, FUZZ_OPTIONS);
  // Strip non-alphanumeric to get comparable character lengths.
  const hLen = csvHeader.toLowerCase().replace(/[^a-z0-9]/g, '').length;
  const sLen = synonym.toLowerCase().replace(/[^a-z0-9]/g, '').length;
  const coverage = Math.min(hLen, sLen) / Math.max(hLen, sLen, 1);
  // Multiplier: 1.0 at equal length, ~0.5 when one string is 5× the other.
  // 40% base ensures the raw score still influences the result.
  return Math.round(raw * (0.4 + 0.6 * coverage));
}

/** Score a CSV header against ALL synonyms of a schema field; return the max. */
function scoreField(csvHeader: string, field: SchemaField): number {
  return Math.max(...field.synonyms.map((s) => scoreSynonym(csvHeader, s)));
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ColumnMatch {
  csvHeader: string;
  dbField: string | null;
  score: number;
  label: string;
  required: boolean;
  valueType: SchemaField['valueType'] | null;
}

/**
 * Match an array of raw CSV headers to DB schema fields.
 *
 * - Each DB field is assigned at most once (greedy highest-score-first).
 * - Headers below `threshold` are left as `{ dbField: null }`.
 *
 * @param csvHeaders  Raw header strings from PapaParse.
 * @param threshold   Minimum score to accept (default 75).
 */
export function matchHeaders(csvHeaders: string[], threshold = 75): ColumnMatch[] {
  // Build scored pairs
  const pairs: Array<{ ci: number; fi: number; score: number }> = [];
  for (let ci = 0; ci < csvHeaders.length; ci++) {
    for (let fi = 0; fi < DB_SCHEMA.length; fi++) {
      const score = scoreField(csvHeaders[ci], DB_SCHEMA[fi]);
      if (score >= threshold) {
        pairs.push({ ci, fi, score });
      }
    }
  }

  // Greedy assignment: best score first, each DB field used at most once
  pairs.sort((a, b) => b.score - a.score);
  const usedFields = new Set<number>();
  const assignments = new Map<number, { fi: number; score: number }>();

  for (const { ci, fi, score } of pairs) {
    if (!assignments.has(ci) && !usedFields.has(fi)) {
      assignments.set(ci, { fi, score });
      usedFields.add(fi);
    }
  }

  return csvHeaders.map((header, i) => {
    const match = assignments.get(i);
    if (match) {
      const field = DB_SCHEMA[match.fi];
      return {
        csvHeader: header,
        dbField: field.key,
        score: match.score,
        label: field.label,
        required: field.required,
        valueType: field.valueType,
      };
    }
    return {
      csvHeader: header,
      dbField: null,
      score: 0,
      label: '— Ignore —',
      required: false,
      valueType: null,
    };
  });
}

/**
 * Convert a ColumnMatch array into the `fieldMapping` record expected by
 * `parseCsvTradesWithNorm()` in tradeImportParser.ts.
 *
 * Example: { "Symbol 🇬🇧": "market", "WIN": "trade_outcome" }
 */
export function toFieldMapping(matches: ColumnMatch[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const m of matches) {
    if (m.dbField) {
      result[m.csvHeader] = m.dbField;
    }
  }
  return result;
}

/** Look up a SchemaField by its key. */
export function getSchemaField(key: string): SchemaField | undefined {
  return DB_SCHEMA.find((f) => f.key === key);
}
