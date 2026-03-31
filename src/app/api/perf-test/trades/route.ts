/**
 * GET /api/perf-test/trades?count=N
 *
 * Returns synthetic Trade[] for performance testing.
 * Used by Playwright tests to inject controlled datasets.
 *
 * Security: Returns 404 in production. Only active when NODE_ENV === 'test'.
 * Cap: count capped at 100,000 to prevent runaway generation.
 *
 * Decision 5A from plan-eng-review: NODE_ENV guard (not secret header)
 * because it's simpler and has zero production overhead.
 */

import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Production safety gate — decision 5A
  if (process.env.NODE_ENV !== 'test') {
    return new NextResponse(null, { status: 404 });
  }

  const { searchParams } = request.nextUrl;
  const rawCount = parseInt(searchParams.get('count') ?? '1000', 10);
  const diverse  = searchParams.get('diverse') === 'true';
  const count    = Math.min(isNaN(rawCount) ? 1000 : Math.max(1, rawCount), 100_000);

  // Import dynamically so this module tree is never bundled in production
  const { generateTrades } = await import('../../../../../tests/benchmark/fixtures/tradeFactory');

  const trades = generateTrades(count, { diverse });

  return NextResponse.json(trades, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Perf-Test': 'true',
      'X-Trade-Count': String(trades.length),
    },
  });
}
