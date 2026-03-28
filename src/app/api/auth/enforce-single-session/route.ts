import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { revokeOtherSessions } from '@/lib/server/auth';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No session' }, { status: 401 });
  }

  await revokeOtherSessions(supabase);
  return NextResponse.json({ ok: true });
}
