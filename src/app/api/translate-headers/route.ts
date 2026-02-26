import type { NextRequest } from 'next/server';
import { ANALYSIS_MODEL } from '@/constants/llmConfig';

export const runtime = 'edge';

/**
 * POST /api/translate-headers
 *
 * Translates unmatched CSV column headers from any language to English
 * so the local fuzzy matcher (fuzzball) can handle them.
 *
 * Called ONLY for headers that scored below threshold in the local match pass.
 * English headers are returned unchanged.
 *
 * Request:  { headers: string[] }
 * Response: Record<string, string>  — { "Résultat": "result", "Paire": "pair" }
 */
export async function POST(req: NextRequest) {
  const { headers } = (await req.json()) as { headers: string[] };

  if (!headers.length) {
    return Response.json({});
  }

  const systemPrompt = `You are a trading journal column name translator.
Return ONLY valid JSON. No markdown, no explanation, just the raw JSON object.`;

  const userPrompt = `Translate these CSV column headers from any language to English.

Return a JSON object where each key is the original header exactly as given,
and each value is its English equivalent for a trading journal context.

Rules:
- If a header is already English, return it unchanged.
- If a header is an abbreviation or symbol that traders use universally (RR, SL, TP, BE, MSS, FVG, BOS, CHoCH), return it unchanged.
- Focus on trading/finance terminology: dates, times, market pairs, direction, outcome, risk, notes, etc.
- Keep translations short and generic (e.g. "Ergebnis" → "result", not "trade result").

Headers to translate:
${headers.map((h) => `"${h}"`).join('\n')}

Return format:
{
  "<original header>": "<english equivalent>",
  ...
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
      max_completion_tokens: 500,
      stream: false,
    }),
  });

  if (!openaiRes.ok) {
    console.error('Header translation error:', await openaiRes.text());
    return Response.json({});
  }

  const data = await openaiRes.json();
  const content = data.choices?.[0]?.message?.content ?? '{}';

  try {
    const cleaned = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return Response.json(JSON.parse(cleaned) as Record<string, string>);
  } catch {
    return Response.json({});
  }
}
