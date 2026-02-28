import type { NextRequest } from 'next/server';
import { ANALYSIS_MODEL } from '@/constants/llmConfig';

export const runtime = 'edge';

/**
 * POST /api/translate-values
 *
 * Translates unrecognized categorical cell values from any language to the
 * canonical English values expected by the import pipeline.
 *
 * Only called for values that the deterministic normalizers (tradeNormalizers.ts)
 * could not resolve. Typically 2-5 unique values total — very cheap.
 *
 * Request:  { fields: { direction?: string[], trade_outcome?: string[], be_final_result?: string[] } }
 * Response: { direction?: Record<string,string>, trade_outcome?: Record<string,string>, be_final_result?: Record<string,string> }
 */
export async function POST(req: NextRequest) {
  const { fields } = (await req.json()) as {
    fields: {
      direction?: string[];
      trade_outcome?: string[];
      be_final_result?: string[];
    };
  };

  const totalValues = [
    ...(fields.direction ?? []),
    ...(fields.trade_outcome ?? []),
    ...(fields.be_final_result ?? []),
  ];

  if (totalValues.length === 0) {
    return Response.json({});
  }

  const systemPrompt = `You are a trading journal data translator.
Return ONLY valid JSON. No markdown, no explanation, just the raw JSON object.`;

  const lines: string[] = [];

  if (fields.direction?.length) {
    lines.push(`direction (map each to exactly "Long" or "Short"): ${JSON.stringify(fields.direction)}`);
  }
  if (fields.trade_outcome?.length) {
    lines.push(`trade_outcome (map each to exactly "Win", "Lose", or "BE"): ${JSON.stringify(fields.trade_outcome)}`);
  }
  if (fields.be_final_result?.length) {
    lines.push(`be_final_result (map each to exactly "Win" or "Lose"): ${JSON.stringify(fields.be_final_result)}`);
  }

  const userPrompt = `These values appear in trading journal CSV columns and were not recognized by the built-in normalizer.
Translate each to its canonical English equivalent for the given field.
If a value genuinely does not map to any allowed option, omit it from the result.

Fields and allowed values:
${lines.join('\n')}

Return a JSON object with only the field names that had values, each containing a mapping object:
{
  "direction": { "<original>": "<Long or Short>", ... },
  "trade_outcome": { "<original>": "<Win, Lose, or BE>", ... },
  "be_final_result": { "<original>": "<Win or Lose>", ... }
}`;

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_completion_tokens: 200,
      stream: false,
    }),
  });

  if (!openaiRes.ok) {
    console.error('Value translation error:', await openaiRes.text());
    return Response.json({});
  }

  const data = await openaiRes.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';

  try {
    const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return Response.json(JSON.parse(cleaned));
  } catch {
    return Response.json({});
  }
}
