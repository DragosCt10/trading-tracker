import { NextRequest } from 'next/server';

export const runtime = 'edge'; // Enable streaming and edge runtime

export async function POST(req: NextRequest) {
  const body = await req.json();

  const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!openaiRes.ok) {
    const errorText = await openaiRes.text();
    return new Response(errorText, { status: openaiRes.status });
  }

  // Stream the response directly to the client
  return new Response(openaiRes.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
