import { NextRequest, NextResponse } from 'next/server';
import { getFilteredTrades, getUserSession } from '@/lib/server/trades';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const { user } = await getUserSession();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const accountId = searchParams.get('accountId');
    const mode = searchParams.get('mode');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId || !accountId || !mode || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify the userId matches the authenticated user (security check)
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const trades = await getFilteredTrades({
      userId,
      accountId,
      mode,
      startDate,
      endDate,
    });

    return NextResponse.json({ trades });
  } catch (error: any) {
    console.error('Error fetching filtered trades:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}
