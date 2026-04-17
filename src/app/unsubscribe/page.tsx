import Link from 'next/link';
import { unsubscribeByToken } from '@/lib/server/settings';

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;

  if (token) {
    await unsubscribeByToken(token);
  }

  // Always show the same message regardless of token validity
  // to prevent token enumeration via response oracle.
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div
        role="status"
        aria-live="polite"
        className="w-full max-w-md rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg p-8 text-center"
      >
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Unsubscribed
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          You won&apos;t receive further newsletter emails.
        </p>
        <Link
          href="/login"
          className="text-sm font-medium text-[var(--tc-primary)] hover:text-[var(--tc-text)] transition-colors duration-200"
        >
          Back to app
        </Link>
      </div>
    </div>
  );
}
