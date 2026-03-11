import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getDashboardApiResponse } from '@/lib/server/dashboardApiResponse';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

  if (!accountId || !mode || !startDate || !endDate) {
    return NextResponse.json({ error: 'Missing required params' }, { status: 400 });
  }

  const response = await getDashboardApiResponse({
    userId: user.id,
    accountId,
    mode,
    startDate,
    endDate,
    strategyId,
    accountBalance,
    execution,
    market,
    includeCompactTrades,
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'private, no-cache, must-revalidate',
    },
  });
}
