import type { NextRequest } from 'next/server';
import { ANALYSIS_MODEL } from '@/constants/llmConfig';

export const runtime = 'edge';

// Required fields — AI must try to match these first, one by one
const REQUIRED_FIELDS = [
  { name: 'trade_date', description: 'Trade date (any format: YYYY-MM-DD, DD/MM/YYYY, DD.MM.YYYY, etc.)' },
  { name: 'trade_time', description: 'Trade entry time (HH:MM or HH:MM:SS). Also look for: Time, Entry Time, Open Time, Hour' },
  { name: 'market', description: 'Market or instrument symbol (EURUSD, GBPUSD, XAUUSD). Also look for: Pair, Symbol, Instrument, Asset, Currency' },
  { name: 'direction', description: 'Trade direction — values must be normalized to "Long" or "Short". Also look for: Side, Order Type, Type, Action, Buy/Sell, Position' },
  { name: 'trade_outcome', description: 'Trade result — values must be normalized to "Win" or "Lose". Also look for: Result, Outcome, Win/Loss, W/L, P/L result, Status' },
  { name: 'risk_per_trade', description: 'Risk percentage per trade (numeric, e.g. 1 for 1%). MUST match columns named: "% Risk", "Risk %", "Risk", "Risk Amount", or any header containing "risk" and a percent sign' },
  { name: 'risk_reward_ratio', description: 'Risk:Reward ratio (numeric, e.g. 2 means 1:2). Also look for: RR, R:R, R/R, Reward, RR Ratio, Risk Reward' },
];

// Optional fields — AI tries to match these after required fields are matched
const OPTIONAL_FIELDS = [
  { name: 'day_of_week', description: 'Day of week (Monday, Tuesday, ...). Also look for: Day, Weekday' },
  { name: 'setup_type', description: 'Trade setup or strategy name. Also look for: Setup, Strategy, Pattern, Signal' },
  { name: 'risk_reward_ratio_long', description: 'Extended or target RR ratio. Also look for: Target RR, Max RR, RR Target' },
  { name: 'sl_size', description: 'Stop loss size in pips or points. Also look for: SL, Stop Loss, SL Pips, SL Size' },
  { name: 'break_even', description: 'Was trade moved to break even (boolean). Also look for: BE, Break Even, Breakeven' },
  { name: 'reentry', description: 'Was this a re-entry trade (boolean). Also look for: Re-entry, Reentry, Re-trade' },
  { name: 'news_related', description: 'Was trade related to a news event (boolean). Also look for: News, News Event, Fundamental' },
  { name: 'local_high_low', description: 'Local high/low trade (boolean). Also look for: LH, LL, Local Level' },
  { name: 'partials_taken', description: 'Were partial profits taken (boolean). Also look for: Partials, Partial Close, TP1' },
  { name: 'executed', description: 'Was trade actually executed (boolean). Also look for: Executed, Taken, Live' },
  { name: 'launch_hour', description: 'Launch hour trade (boolean).' },
  { name: 'mss', description: 'Market structure shift. Also look for: MSS, Structure, CHoCH, Break of Structure' },
  { name: 'liquidity', description: 'Liquidity type. Also look for: Liq, Liquidity Level' },
  { name: 'trade_link', description: 'URL link to trade screenshot or chart. Also look for: Link, Chart, Screenshot, URL' },
  { name: 'liquidity_taken', description: 'Liquidity taken type. Also look for: Liq Taken, Stop Hunt' },
  { name: 'evaluation', description: 'Trade evaluation or grade. Also look for: Grade, Score, Quality, Rating' },
  { name: 'notes', description: 'Trade notes or comments. Also look for: Comments, Note, Remarks, Description' },
  { name: 'calculated_profit', description: 'Calculated profit/loss dollar amount. Also look for: P&L, Profit, PnL, Net P&L, Gain/Loss' },
  { name: 'pnl_percentage', description: 'P&L as percentage of account. Also look for: PnL %, Profit %, Return %' },
  { name: 'displacement_size', description: 'Displacement candle size in pips. Also look for: Displacement, Disp' },
  { name: 'fvg_size', description: 'Fair value gap size. Also look for: FVG, Fair Value Gap' },
];

export async function POST(req: NextRequest) {
  const { headers, columnSamples } = await req.json() as {
    headers: string[];
    columnSamples: Record<string, string[]>;
  };

  const requiredFieldList = REQUIRED_FIELDS.map((f) => `  - "${f.name}": ${f.description}`).join('\n');
  const optionalFieldList = OPTIONAL_FIELDS.map((f) => `  - "${f.name}": ${f.description}`).join('\n');

  const columnInfo = headers.map((h) => {
    const samples = (columnSamples[h] ?? []).slice(0, 15);
    return `  "${h}": [${samples.map((s) => `"${s}"`).join(', ')}]`;
  }).join('\n');

  const systemPrompt = `You are a CSV trade data mapping and normalization assistant.
Return ONLY valid JSON. No markdown, no explanation, just the raw JSON object.`;

  const userPrompt = `You are given CSV column names with sample values. Map them to database fields and provide value normalizations.

CSV columns with sample values:
${columnInfo}

---

STEP 1 — Match REQUIRED fields first (one by one, in order):
${requiredFieldList}

For each required field, examine every CSV column name and its sample values carefully.
Use semantic understanding — the CSV column name may be different (e.g. "Win/Lose" maps to "trade_outcome", "Pair" maps to "market", "Buy/Sell" maps to "direction").
IMPORTANT: A column named "% Risk" or "Risk %" must always map to "risk_per_trade". Do not leave it unmatched.
Look at sample values as a strong hint when the name is ambiguous.

STEP 2 — Then match OPTIONAL fields with the remaining unmatched CSV columns:
${optionalFieldList}

Apply the same semantic matching. Only assign a DB field if there is a reasonable match.

---

CRITICAL RULE FOR ALL NORMALIZATION MAPS:
- The JSON key is ALWAYS the raw value exactly as it appears in the CSV sample data.
- The JSON value is ALWAYS the normalized database value.
- NEVER invert this. NEVER concatenate multiple values into one key or one value.

Correct example — if the CSV direction column has samples ["BUY", "SELL", "buy"]:
{
  "direction": {
    "BUY": "Long",
    "SELL": "Short",
    "buy": "Long"
  }
}

Wrong example — do NOT do this:
{
  "direction": {
    "Long": "BUYSELLbuy",
    "Short": "SELLsell"
  }
}

Return this exact JSON structure:
{
  "fieldMapping": {
    "<csv_header_exactly_as_given>": "<db_field_name or null>",
    ...
  },
  "normalizations": {
    "direction": {
      "<raw_csv_value>": "Long",
      "<raw_csv_value>": "Short"
    },
    "trade_outcome": {
      "<raw_csv_value>": "Win",
      "<raw_csv_value>": "Lose"
    },
    "market": {
      "<raw_csv_value>": "<cleaned_uppercase_symbol>"
    },
    "booleans": {
      "<matched_boolean_field_name>": {
        "<raw_csv_value>": true,
        "<raw_csv_value>": false
      }
    }
  }
}

Rules:
1. fieldMapping: Each CSV header maps to exactly one DB field name, or null. Each DB field appears at most once.
2. normalizations.direction: For EACH unique raw CSV value in the direction column samples, output one key-value pair. The key is the exact raw value, the value is "Long" or "Short".
   - Raw values meaning Long: buy, BUY, B, long, LONG, Long, Buy → "Long"
   - Raw values meaning Short: sell, SELL, S, short, SHORT, Short, Sell → "Short"
3. normalizations.trade_outcome: For EACH unique raw CSV value in the outcome column samples, one key-value pair. The key is the exact raw value, the value is "Win" or "Lose".
   - Raw values meaning Win: win, WIN, W, profit, TP, won, Won, Profit → "Win"
   - Raw values meaning Lose: lose, loss, LOSS, LOSE, L, SL, sl, stop, Stop Loss, Loss → "Lose"
4. normalizations.market: For EACH unique raw CSV value in the market column samples, one key-value pair. The key is the exact raw value, the value is the cleaned symbol.
   - Remove slashes: "EUR/USD" → "EURUSD", "XAU/USD" → "XAUUSD"
   - Remove flag emojis and special characters: "GBP/USD 🇬🇧" → "GBPUSD"
   - Remove spaces: "EUR USD" → "EURUSD"
   - Keep already clean symbols unchanged: "NAS100" → "NAS100"
   - Common aliases: "Gold" → "XAUUSD", "Silver" → "XAGUSD"
5. normalizations.booleans: For EACH boolean field matched (break_even, reentry, news_related, local_high_low, partials_taken, executed, launch_hour), and for EACH unique raw value in its samples, output one key-value pair where the value is true or false.
   - Regardless of language: Yes/Oui/Sí/Ja/Da/Sim/✓/x/X/1/true → true
   - No/Non/Nein/Нет/Não/✗/0/false → false
   - Empty string → false
6. Only include normalization entries for fields that were actually matched in fieldMapping.
7. Every unique sample value must appear as a separate key — never merge or concatenate multiple values.`;

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_completion_tokens: 3000,
      stream: false,
    }),
  });

  if (!openaiRes.ok) {
    const errorText = await openaiRes.text();
    console.error('AI import mapping error:', errorText);
    return Response.json({ fieldMapping: {}, normalizations: {} });
  }

  const data = await openaiRes.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';

  try {
    const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleaned) as {
      fieldMapping: Record<string, string | null>;
      normalizations: {
        direction?: Record<string, string>;
        trade_outcome?: Record<string, string>;
        market?: Record<string, string>;
        booleans?: Record<string, Record<string, boolean>>;
      };
    };
    return Response.json(result);
  } catch {
    return Response.json({ fieldMapping: {}, normalizations: {} });
  }
}
