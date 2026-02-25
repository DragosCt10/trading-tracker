import type { NextRequest } from 'next/server';
import { ANALYSIS_MODEL } from '@/constants/llmConfig';

export const runtime = 'edge';

const TRADE_FIELDS = [
  'trade_date', 'trade_time', 'day_of_week', 'market', 'direction', 'setup_type',
  'trade_outcome', 'risk_per_trade', 'trade_link', 'liquidity_taken', 'local_high_low',
  'news_related', 'reentry', 'break_even', 'mss', 'risk_reward_ratio',
  'risk_reward_ratio_long', 'sl_size', 'calculated_profit', 'pnl_percentage',
  'evaluation', 'notes', 'executed', 'partials_taken', 'launch_hour',
  'displacement_size', 'liquidity',
];

export async function POST(req: NextRequest) {
  const { headers } = await req.json() as { headers: string[] };

  const systemPrompt = `You are a data mapping assistant. Your job is to map CSV column headers to database field names.
Return ONLY a valid JSON object. No markdown, no explanation, just the JSON.`;

  const userPrompt = `Map these CSV column headers to the correct Trade database field names.

CSV headers: ${headers.join(', ')}

Available DB fields: ${TRADE_FIELDS.join(', ')}

Rules:
- Return a JSON object where each key is a CSV header and the value is the matching DB field name, or null if no clear match.
- Be lenient with fuzzy/abbreviated names. Examples: "Date"→"trade_date", "Win/Loss"→"trade_outcome", "RR"→"risk_reward_ratio", "Setup"→"setup_type", "Risk %"→"risk_per_trade", "BE"→"break_even", "P&L"→"pnl_percentage".
- Each DB field should appear at most once in the output.
- Return null for headers with no reasonable match.`;

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
      max_completion_tokens: 1000,
      stream: false,
    }),
  });

  if (!openaiRes.ok) {
    const errorText = await openaiRes.text();
    console.error('AI mapping error:', errorText);
    return Response.json({ mapping: {} });
  }

  const data = await openaiRes.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';

  try {
    // Strip markdown code fences if present
    const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const mapping = JSON.parse(cleaned) as Record<string, string | null>;

    return Response.json({ mapping });
  } catch {
    // Fail gracefully — UI will let user map manually
    return Response.json({ mapping: {} });
  }
}
