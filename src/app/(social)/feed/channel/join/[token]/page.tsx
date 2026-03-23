import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCachedUserSession } from '@/lib/server/session';
import { redeemChannelInvite } from '@/lib/server/channelInvites';

interface Props {
  params: Promise<{ token: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID:  'This invite link is invalid or has been revoked.',
  EXPIRED:  'This invite link has expired.',
  MAXED:    'This invite link has reached its maximum number of uses.',
  DB_ERROR: 'Something went wrong. Please try again later.',
};

export default async function JoinChannelPage({ params }: Props) {
  const { token } = await params;

  const session = await getCachedUserSession();
  if (!session.user) {
    redirect(`/login?redirectTo=/feed/channel/join/${token}`);
  }

  const result = await redeemChannelInvite(token);

  if ('data' in result) {
    redirect(`/feed/channel/${result.data.channelSlug}`);
  }

  const message = ERROR_MESSAGES[result.code] ?? 'Something went wrong.';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-rose-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            Invite link unavailable
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
        </div>
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-50 transition-colors"
        >
          ← Go to Feed
        </Link>
      </div>
    </div>
  );
}
