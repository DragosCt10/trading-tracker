'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const REDIRECT_SECONDS = 3;

export default function JoinChannelSuccess({ channelSlug, alreadyMember }: { channelSlug: string; alreadyMember: boolean }) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(REDIRECT_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (seconds === 0) {
      router.push(`/feed/channel/${channelSlug}`);
    }
  }, [seconds, channelSlug, router]);

  return (
    <div className="relative overflow-hidden flex items-start justify-center px-4 pb-4 pt-15">
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-foreground">
              {alreadyMember ? "Already a member!" : "You're in!"}
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              {alreadyMember
                ? "You're already part of this channel."
                : "Welcome to the channel. You've been added successfully."}
            </p>
          </div>
        </div>

        {/* Redirect countdown card */}
        <div className="rounded-2xl border border-[var(--tc-primary)]/20 bg-[var(--tc-primary)]/5 p-6 text-center space-y-4">
          <p className="text-sm font-medium text-foreground">
            Redirecting you in{' '}
            <span className="font-bold" style={{ color: 'var(--tc-primary)' }}>
              {seconds}s
            </span>
          </p>
          {/* Progress bar */}
          <div className="mx-auto w-full h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${(seconds / REDIRECT_SECONDS) * 100}%`,
                transition: 'width 1s linear',
                background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent))',
              }}
            />
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          You can also navigate there manually from the feed.
        </p>
      </div>
    </div>
  );
}
