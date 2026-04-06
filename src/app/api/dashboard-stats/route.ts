import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getDashboardApiResponse } from '@/lib/server/dashboardApiResponse';
import { checkRateLimit } from '@/lib/rateLimit';
import { buildStatsCacheKey, getStatsCache, setStatsCache } from '@/lib/statsCache';
import type { TradingMode } from '@/types/trade';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!await checkRateLimit(`stats:${user.id}`, 300, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = req.nextUrl;
  const accountId = searchParams.get('accountId');
  const mode = searchParams.get('mode');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const strategyId = searchParams.get('strategyId') || null;
  const accountBalance = Number(searchParams.get('accountBalance') ?? '0');
  const executionParam = searchParams.get('execution') ?? 'executed';
  const execution = executionParam === 'nonExecuted' ? 'non_executed' : executionParam;
  const market = searchParams.get('market') ?? 'all';
  const includeCompactTrades = searchParams.get('includeCompactTrades') === 'true';
  const includeSeries = searchParams.get('includeSeries') === 'true';

  if (!accountId || !mode || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  const VALID_MODES: TradingMode[] = ['live', 'demo', 'backtesting'];
  if (!VALID_MODES.includes(mode as TradingMode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }
  const validatedMode = mode as TradingMode;

  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  if (!DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
    return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
  }

  if (isNaN(accountBalance) || accountBalance < 0) {
    return NextResponse.json({ error: 'Invalid accountBalance' }, { status: 400 });
  }

  const { data: ownedAccount, error: accountOwnershipError } = await supabase
    .from('account_settings')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .eq('mode', mode)
    .maybeSingle();

  if (accountOwnershipError) {
    console.error('dashboard-stats account ownership check failed:', accountOwnershipError);
    return NextResponse.json({ error: 'Failed to validate account access' }, { status: 500 });
  }

  if (!ownedAccount) {
    return NextResponse.json({ error: 'Forbidden account access' }, { status: 403 });
  }

  const cacheKey = buildStatsCacheKey({
    userId: user.id,
    accountId,
    strategyId,
    mode: validatedMode,
    startDate,
    endDate,
    execution,
    market,
    includeCompactTrades,
    includeSeries,
  });

  const cached = getStatsCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'private, no-cache, must-revalidate',
        'X-Cache': 'HIT',
      },
    });
  }

  const response = await getDashboardApiResponse({
    userId: user.id,
    accountId,
    mode: validatedMode,
    startDate,
    endDate,
    strategyId,
    accountBalance,
    execution,
    market,
    includeCompactTrades,
    includeSeries,
  });

  setStatsCache(cacheKey, response);

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'private, no-cache, must-revalidate',
      'X-Cache': 'MISS',
    },
  });
}
