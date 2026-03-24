import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCachedUserSession } from '@/lib/server/session';
import { redeemChannelInvite } from '@/lib/server/channelInvites';
import JoinChannelSuccess from './JoinChannelSuccess';

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
    return <JoinChannelSuccess channelSlug={result.data.channelSlug} alreadyMember={result.data.alreadyMember} />;
  }

  const message = ERROR_MESSAGES[result.code] ?? 'Something went wrong.';

  return (
    <div className="relative overflow-hidden flex items-start justify-center px-4 pb-4 pt-15 transition-colors duration-500">
      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-0 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Top accent line */}
        <div className="absolute -top-2.5 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--tc-primary)] to-transparent opacity-50" />

        <div className="flex flex-col items-center space-y-6 my-10">
          {/* Icon with glow */}
          <div className="relative group">
            <div className="absolute -inset-3 rounded-2xl blur-xl opacity-20 bg-rose-500 transition duration-500" />
            <div className="relative grid h-20 w-20 place-content-center rounded-xl bg-muted/50 border border-border backdrop-blur-sm shadow-2xl">
              <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-foreground">
              Link unavailable
            </h1>
            <p className="text-sm text-muted-foreground font-medium">{message}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tc-primary)] hover:text-[var(--tc-text)] transition-colors duration-200"
          >
            ← Go to Feed
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>

    </div>
  );
}
