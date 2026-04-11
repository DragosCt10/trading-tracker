'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { redeemChannelInvite } from '@/lib/server/channelInvites';

const ERROR_MESSAGES: Record<string, string> = {
  INVALID:  'This invite link is invalid or has been revoked.',
  EXPIRED:  'This invite link has expired.',
  MAXED:    'This invite link has reached its maximum number of uses.',
  DB_ERROR: 'Something went wrong. Please try again later.',
};

export default function JoinChannelButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleJoin = async () => {
    setPending(true);
    setError(null);

    const result = await redeemChannelInvite(token);

    if ('data' in result) {
      router.push(`/feed/channel/${result.data.channelSlug}`);
      return;
    }

    setError(ERROR_MESSAGES[result.code] ?? 'Something went wrong.');
    setPending(false);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <p id="join-error" role="alert" className="text-sm text-rose-500 text-center">{error}</p>
      )}
      <button
        onClick={handleJoin}
        disabled={pending}
        aria-describedby={error ? 'join-error' : undefined}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-[var(--tc-primary)] hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Joining…
          </>
        ) : (
          'Accept Invite'
        )}
      </button>
    </div>
  );
}
