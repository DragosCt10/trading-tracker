import type { NextRequest } from 'next/server';
import { ANALYSIS_MODEL } from '@/constants/llmConfig';

export const runtime = 'edge';

const BATCH_SIZE = 25;

/** Normalize raw CSV row values into DB-ready trade objects using AI. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      rows: Record<string, string>[];
      defaults?: { risk_per_trade?: number; risk_reward_ratio?: number };
    };
    const { rows, defaults } = body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ trades: [], errors: [] });
    }

    const defaultRisk = defaults?.risk_per_trade ?? 1;
    const defaultRR = defaults?.risk_reward_ratio ?? 1;

    const systemPrompt = `You are a data normalization assistant for trade imports. You receive raw CSV row data (keys = field names, values = raw strings) and must output a JSON array of trade objects ready for database insert.

CRITICAL RULES:
- direction: must be exactly "Long" or "Short". Map buy/sell, call/put, long/short, 1/2, +/-, bull/bear, etc. to the correct value.
- trade_outcome: must be exactly "Win" or "Lose". Map win/lose, profit/loss, green/red, tp/sl, 1/0, success/failure, etc.
- trade_date: must be YYYY-MM-DD. Parse any format (DD.MM.YYYY, DD/MM/YYYY, MM/DD/YYYY, etc.) and output ISO date only.
- trade_time: must be HH:MM:SS. Parse 09:00, 0900, 9:00 AM, etc. Use "00:00:00" if empty.
- market: uppercase, letters and numbers only (no spaces, dots, or special chars). e.g. "eur usd" -> "EURUSD", "XAU/USD" -> "XAUUSD".
- All numeric fields (risk_per_trade, risk_reward_ratio, risk_reward_ratio_long, sl_size, displacement_size, fvg_size, calculated_profit, pnl_percentage): output as numbers. Strip %, currency symbols. Use default_risk_per_trade for empty risk_per_trade and default_risk_reward_ratio for empty risk_reward_ratio.
- Booleans (break_even, reentry, news_related, local_high_low, partials_taken, executed, launch_hour): output true or false. Map yes/no, 1/0, x, true/false, etc.
- Text fields (trade_link, liquidity_taken, setup_type, liquidity, mss, notes, evaluation, trend, day_of_week, quarter): output string; use "" if empty. Derive day_of_week and quarter from trade_date when possible.
- risk_reward_ratio_long: use provided value or 0 for Lose, or same as risk_reward_ratio for Win when empty.
- executed: default true when not provided.
- displacement_size, fvg_size: number or 0 when empty; fvg_size can be null.
- confidence_at_entry, mind_state_at_entry: integer 1-5 or null.
- strategy_id: leave null.

Output ONLY a valid JSON array of objects. No markdown, no explanation. Each object must have: trade_date, trade_time, day_of_week, market, setup_type, liquidity, sl_size, direction, trade_outcome, break_even, reentry, news_related, mss, risk_reward_ratio, risk_reward_ratio_long, local_high_low, risk_per_trade, quarter, evaluation, partials_taken, executed, launch_hour, displacement_size, trade_link, liquidity_taken, trend, notes, calculated_profit, pnl_percentage, fvg_size, confidence_at_entry, mind_state_at_entry.`;

    const batches: Record<string, string>[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE));
    }

    const allTrades: Record<string, unknown>[] = [];
    const errors: { rowIndex: number; message: string }[] = [];
    let globalIndex = 0;

    for (const batch of batches) {
      const userPrompt = `Default risk_per_trade when missing: ${defaultRisk}. Default risk_reward_ratio when missing: ${defaultRR}.

Normalize these ${batch.length} raw trade rows into the exact format described. Return a JSON array of ${batch.length} objects only.

Raw rows (array of objects, each key is field name, value is raw string):
${JSON.stringify(batch)}`;

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
          max_tokens: 8000,
          stream: false,
        }),
      });

      if (!openaiRes.ok) {
        const errText = await openaiRes.text();
        for (let i = 0; i < batch.length; i++) {
          errors.push({ rowIndex: globalIndex + i + 1, message: `AI error: ${errText.slice(0, 100)}` });
        }
        globalIndex += batch.length;
        continue;
      }

      const data = await openaiRes.json();
      const content = data.choices?.[0]?.message?.content ?? '[]';
      let parsed: unknown[];
      try {
        const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned) as unknown[];
      } catch {
        for (let i = 0; i < batch.length; i++) {
          errors.push({ rowIndex: globalIndex + i + 1, message: 'AI returned invalid JSON' });
        }
        globalIndex += batch.length;
        continue;
      }

      if (!Array.isArray(parsed)) {
        for (let i = 0; i < batch.length; i++) {
          errors.push({ rowIndex: globalIndex + i + 1, message: 'AI did not return an array' });
        }
        globalIndex += batch.length;
        continue;
      }

      parsed.forEach((item, i) => {
        const rowIndex = globalIndex + i + 1;
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          const obj = item as Record<string, unknown>;
          if (obj.direction !== 'Long' && obj.direction !== 'Short') {
            errors.push({ rowIndex, message: 'direction must be Long or Short' });
          }
          if (obj.trade_outcome !== 'Win' && obj.trade_outcome !== 'Lose') {
            errors.push({ rowIndex, message: 'trade_outcome must be Win or Lose' });
          }
          allTrades.push(obj);
        } else {
          errors.push({ rowIndex, message: 'Missing or invalid row from AI' });
        }
      });
      globalIndex += batch.length;
    }

    return Response.json({ trades: allTrades, errors });
  } catch (e) {
    console.error('normalize-trade-rows error:', e);
    return Response.json({ trades: [], errors: [{ rowIndex: 1, message: 'Server error' }] }, { status: 500 });
  }
}
