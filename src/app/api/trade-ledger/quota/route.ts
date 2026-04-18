import { NextResponse } from 'next/server';
import { getCachedUserSession } from '@/lib/server/session';
import { getTradeLedgerQuota } from '@/lib/server/subscription';

export const runtime = 'nodejs';

export async function GET() {
  const { user } = await getCachedUserSession();
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const quota = await getTradeLedgerQuota(user.id);
  return NextResponse.json(quota, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
