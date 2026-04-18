'use client';

import Link from 'next/link';
import { useState } from 'react';
import { FileText, Plus, Trash2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ReportBuilderModal } from '@/components/trade-ledger/ReportBuilderModal';
import type { AccountOption } from '@/components/trade-ledger/builder/AccountPicker';
import { useTradeLedgerTemplates } from '@/hooks/useTradeLedgerTemplates';
import type { AccountRow } from '@/lib/server/accounts';
import type { ReportConfig } from '@/lib/tradeLedger/reportConfig';
import { format } from 'date-fns';

interface TradeLedgerClientProps {
  userId: string;
  accounts: AccountRow[];
  hasAccess: boolean;
  tierLabel: string;
}

export function TradeLedgerClient({
  userId,
  accounts,
  hasAccess,
  tierLabel,
}: TradeLedgerClientProps) {
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [prefillConfig, setPrefillConfig] = useState<ReportConfig | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const templates = useTradeLedgerTemplates(userId);

  const accountOptions: AccountOption[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    currency: a.currency,
    mode: a.mode as 'live' | 'demo' | 'backtesting',
    balance: Number(a.account_balance),
  }));

  if (!hasAccess) {
    return <UpgradeGate currentTier={tierLabel} />;
  }

  function openNew() {
    setPrefillConfig(undefined);
    setIsBuilderOpen(true);
  }

  function openFromTemplate(config: ReportConfig) {
    setPrefillConfig(config);
    setIsBuilderOpen(true);
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Trade Ledger
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Banking-style PDF reports of your trading activity. Save templates,
            share read-only links.
          </p>
        </div>
        <Button
          onClick={openNew}
          className="themed-btn-primary cursor-pointer shrink-0 relative overflow-hidden rounded-xl text-white font-semibold border-0 px-4 py-2 group [&_svg]:text-white"
        >
          <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
            <Plus className="h-4 w-4" />
            New Report
          </span>
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
        </Button>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Saved templates
        </h2>
        {templates.list.isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <Card
                key={i}
                className="rounded-xl border text-card-foreground relative border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm"
              >
                <div className="relative p-4 sm:p-6 flex flex-col h-full animate-pulse">
                  {/* Title + delete */}
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="h-5 w-2/3 rounded-md bg-slate-200/70 dark:bg-slate-700/60" />
                    <div className="h-8 w-8 shrink-0 rounded-xl bg-slate-200/70 dark:bg-slate-700/60" />
                  </div>
                  {/* Filler line — mimics the visual weight of the title block */}
                  <div className="h-3 w-1/2 rounded-md bg-slate-200/60 dark:bg-slate-700/50" />
                  {/* Meta + load action */}
                  <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
                    <div className="h-3 w-24 rounded-md bg-slate-200/60 dark:bg-slate-700/50" />
                    <div className="h-8 w-16 rounded-xl bg-slate-200/70 dark:bg-slate-700/60" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : templates.list.data && templates.list.data.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.list.data.map((t) => (
              <Card
                key={t.id}
                className="rounded-xl border text-card-foreground z-1 relative border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm"
              >
                <div className="relative p-4 sm:p-6 flex flex-col h-full">
                  {/* Title + delete (top-right) */}
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                      {t.name}
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(t.id); }}
                      aria-label={`Delete template ${t.name}`}
                      className="relative h-8 w-8 p-0 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 border-0 disabled:opacity-60 transition-all duration-300 group cursor-pointer shrink-0"
                    >
                      <span className="relative z-10 flex h-full w-full items-center justify-center">
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                    </Button>
                  </div>

                  {/* Action + meta (below border) */}
                  <div className="flex items-center justify-between gap-2 mt-auto pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Updated {format(new Date(t.updatedAt), 'MMM d, yyyy')}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => openFromTemplate(t.config)}
                      className="cursor-pointer relative h-8 overflow-hidden rounded-xl themed-btn-primary text-white font-semibold group border-0 text-xs [&_svg]:text-white px-3"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2 group-hover:text-white">
                        <FileText className="h-4 w-4 group-hover:text-white" />
                        <span className="group-hover:text-white">Load</span>
                      </span>
                      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyTemplates onCreate={openNew} />
        )}
      </section>

      <ReportBuilderModal
        open={isBuilderOpen}
        onOpenChange={setIsBuilderOpen}
        userId={userId}
        accounts={accountOptions}
        initialConfig={prefillConfig}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="max-w-md fade-content data-[state=open]:fade-content data-[state=closed]:fade-content border border-slate-200/70 dark:border-slate-800/70 modal-bg-gradient !rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <span className="text-red-500 dark:text-red-400 font-semibold text-lg">Confirm Delete</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-slate-600 dark:text-slate-400">
                Are you sure you want to delete this template? This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-3">
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                onClick={() => setDeleteId(null)}
                disabled={templates.remove.isPending}
                className="rounded-xl cursor-pointer border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300"
              >
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!deleteId) return;
                  await templates.remove.mutateAsync(deleteId);
                  setDeleteId(null);
                }}
                className="relative cursor-pointer px-4 py-2 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 flex items-center gap-2"
              >
                Yes, Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyTemplates({ onCreate }: { onCreate: () => void }) {
  return (
    <Card
      onClick={onCreate}
      className="rounded-xl border-dashed border-2 text-card-foreground mb-4 z-1 relative border-slate-300/40 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 shadow-md shadow-slate-200/50 dark:shadow-none backdrop-blur-sm cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all duration-200"
    >
      <div className="relative p-6 flex flex-col items-center justify-center text-center h-full min-h-[320px]">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 themed-header-icon-box">
          <Plus className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          No templates yet
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
          Build a report once, save it as a template, and regenerate it any time —
          monthly audits, prop firm submissions, tax prep.
        </p>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onCreate();
          }}
          className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 mt-4 group border-0 text-sm"
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" />
            Create your first report
          </span>
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
        </Button>
      </div>
    </Card>
  );
}

function UpgradeGate({ currentTier }: { currentTier: string }) {
  return (
    <div className="max-w-xl mx-auto mt-12 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Trade Ledger is available on Starter Plus and above
      </h1>
      <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
        Generate banking-style PDF reports of your trading activity, save
        templates, and share read-only links with prop firms, mentors, or your
        accountant.
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-500 mt-4">
        You&apos;re currently on {currentTier}.
      </p>
      <Button asChild className="mt-6">
        <Link href="/pricing">See pricing</Link>
      </Button>
    </div>
  );
}
