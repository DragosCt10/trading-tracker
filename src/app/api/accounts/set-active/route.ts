import { NextRequest, NextResponse } from 'next/server';
import { setActiveAccount } from '@/lib/server/accounts';
import type { TradingMode } from '@/types/trade';

const VALID_MODES: TradingMode[] = ['live', 'demo', 'backtesting'];

// Dedicated API route instead of a Server Action so that switching the active
// account doesn't trigger an RSC re-render of the current route. On heavy
// pages (/stats, /strategy/*) the implicit Server-Action RSC refresh was
// adding 3-5s of latency on top of the DB UPDATE. See ActionBar.tsx `applyWith`.
export async function POST(req: NextRequest) {
  let body: { mode?: unknown; accountId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: 'Invalid JSON body' } }, { status: 400 });
  }

  const { mode, accountId } = body;

  if (typeof mode !== 'string' || !VALID_MODES.includes(mode as TradingMode)) {
    return NextResponse.json({ error: { message: 'Invalid mode' } }, { status: 400 });
  }
  if (accountId !== null && (typeof accountId !== 'string' || accountId.length === 0)) {
    return NextResponse.json({ error: { message: 'Invalid accountId' } }, { status: 400 });
  }

  const { data, error } = await setActiveAccount(
    mode as TradingMode,
    (accountId as string | null) ?? null
  );

  if (error) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ data: null, error }, { status });
  }
  return NextResponse.json({ data, error: null });
}
