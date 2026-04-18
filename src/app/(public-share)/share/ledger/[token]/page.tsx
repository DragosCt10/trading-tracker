import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { Lock, Share2 } from 'lucide-react';
import { getSharedReport } from '@/lib/server/tradeLedgerShares';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/shared/Footer';

export const metadata = {
  title: 'Shared report · Alpha Stats',
  description: 'Read-only trading report shared via Alpha Stats.',
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicTradeLedgerSharePage({ params }: PageProps) {
  const { token } = await params;
  const shared = await getSharedReport(token);
  if (!shared) return notFound();

  const period = shared.config.period;
  const mode = shared.config.mode;
  const expiresAt = shared.expiresAt;
  const pdfUrl = `/api/trade-ledger/share/${token}/pdf`;

  const dateRangeLabel = `${format(new Date(period.start), 'MMM d, yyyy')} – ${format(
    new Date(period.end),
    'MMM d, yyyy',
  )}`;

  return (
    <div className="min-h-screen max-w-(--breakpoint-xl) mx-auto w-full flex flex-col text-slate-900 dark:text-slate-50">
      <main className="flex-1 w-full mt-12">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--tc-primary)]/50 px-3 py-1 text-xs font-medium shadow-sm bg-[var(--tc-primary)]/10 text-[var(--tc-primary)]">
                <Share2 className="h-3.5 w-3.5" />
                <span>Read-only shared view</span>
              </div>
              {expiresAt && (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 px-3 py-1 text-xs text-slate-500 dark:text-slate-400 backdrop-blur-sm">
                  <span>
                    Valid until{' '}
                    {new Date(expiresAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
                Trade Ledger Report
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-xl">
                Public snapshot of a trading activity report for the selected period.
                The integrity hash below covers the data depicted; re-rendering the
                same period yields the same hash.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="text-[11px] font-semibold uppercase tracking-wide px-3 py-1 rounded-full border-[var(--tc-primary)]/60 bg-[var(--tc-primary)]/15 text-[var(--tc-primary)]"
              >
                {mode.toUpperCase()} MODE
              </Badge>
              <Badge
                variant="outline"
                className="text-[11px] font-medium uppercase tracking-wide rounded-full border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 text-slate-600 dark:text-slate-200 px-3 py-1 backdrop-blur-sm"
              >
                {dateRangeLabel}
              </Badge>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 px-3 py-1 text-[11px] text-slate-600 dark:text-slate-300 backdrop-blur-sm">
              <Lock className="h-3.5 w-3.5 text-slate-400" />
              <span>Viewer cannot edit the report</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/60 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 px-3 py-1 text-[11px] text-slate-500 dark:text-slate-400 backdrop-blur-sm font-mono">
              <span>SHA-256 {shared.integrityHash.slice(0, 16)}…</span>
            </div>
          </div>
        </header>

        <hr className="col-span-full my-8 border-t border-slate-200 dark:border-slate-700" />

        <div className="aspect-[1/1.414] w-full rounded-2xl overflow-hidden border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
          <iframe
            src={pdfUrl}
            title="Shared Trade Ledger report"
            className="w-full h-full"
          />
        </div>

        <Footer />
      </main>
    </div>
  );
}
