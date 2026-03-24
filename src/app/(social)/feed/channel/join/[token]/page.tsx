import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCachedUserSession } from '@/lib/server/session';
import { createClient } from '@/utils/supabase/server';
import JoinChannelSuccess from './JoinChannelSuccess';
import JoinChannelButton from './JoinChannelButton';

interface Props {
  params: Promise<{ token: string }>;
}

// Fetch a read-only preview of the invite — no DB state is mutated.
// Actual redemption (use_count increment + join) happens in JoinChannelButton
// via a Server Action triggered by explicit user click.
async function getInvitePreview(token: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('channel_invites')
    .select('is_active, expires_at, max_uses, use_count, feed_channels(name, slug)')
    .eq('token', token)
    .maybeSingle();

  if (error || !data) return null;

  type Row = {
    is_active: boolean;
    expires_at: string | null;
    max_uses: number | null;
    use_count: number;
    feed_channels: { name: string; slug: string } | null;
  };

  return data as Row;
}

export default async function JoinChannelPage({ params }: Props) {
  const { token } = await params;

  const session = await getCachedUserSession();
  if (!session.user) {
    redirect(`/login?redirectTo=/feed/channel/join/${token}`);
  }

  const invite = await getInvitePreview(token);

  // Invalid, revoked, or token not found
  if (!invite || !invite.is_active) {
    return <InviteError message="This invite link is invalid or has been revoked." />;
  }

  // Expired
  if (invite.expires_at !== null && new Date(invite.expires_at) <= new Date()) {
    return <InviteError message="This invite link has expired." />;
  }

  // Maxed
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return <InviteError message="This invite link has reached its maximum number of uses." />;
  }

  const channelName = invite.feed_channels?.name ?? 'a channel';

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
            <div
              className="absolute -inset-3 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition duration-500"
              style={{ background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))' }}
            />
            <div className="relative grid h-20 w-20 place-content-center rounded-xl bg-muted/50 border border-border backdrop-blur-sm shadow-2xl">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--tc-primary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-foreground">
              You&apos;re invited
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              You&apos;ve been invited to join{' '}
              <span className="font-semibold text-foreground">#{channelName}</span>
            </p>
          </div>
        </div>

        {/* Uses / expiry metadata */}
        <div className="rounded-2xl border border-[var(--tc-primary)]/20 bg-[var(--tc-primary)]/5 p-5 mb-6 text-center space-y-1">
          {invite.max_uses !== null && (
            <p className="text-xs text-muted-foreground">
              {invite.max_uses - invite.use_count} use{invite.max_uses - invite.use_count !== 1 ? 's' : ''} remaining
            </p>
          )}
          {invite.expires_at !== null && (
            <p className="text-xs text-muted-foreground">
              Expires {new Date(invite.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
          {invite.max_uses === null && invite.expires_at === null && (
            <p className="text-xs text-muted-foreground">No expiry · Unlimited uses</p>
          )}
        </div>

        <JoinChannelButton token={token} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By accepting you agree to the channel&apos;s rules.
        </p>
      </div>
    </div>
  );
}

function InviteError({ message }: { message: string }) {
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
