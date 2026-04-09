'use client';

import { useState, useMemo } from 'react';
import { Trophy, CheckCircle2, Copy, Check, Loader2 } from 'lucide-react';
import { FEED_CARD_SURFACE_CLASS } from './feedCardStyles';
import { useActivityProgress } from '@/hooks/useActivityProgress';
import { redeemActivityDiscount, applyDiscountToSubscription } from '@/lib/server/rewards';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UserDiscount } from '@/types/userDiscount';

const MILESTONES = [100, 200];
const MILESTONE_LABELS = [100, 200, 300];
const GOAL = 300;

function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const days = useMemo(() => {
    const now = new Date();
    return Math.ceil((new Date(expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [expiresAt]);
  if (days <= 0) return <span className="text-xs text-rose-500">Expired</span>;
  return (
    <span className={`text-xs ${days <= 7 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
      Expires in {days} day{days !== 1 ? 's' : ''}
    </span>
  );
}

function ProgressSkeleton() {
  return (
    <div className={cn(FEED_CARD_SURFACE_CLASS, 'p-4 animate-pulse')}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700" />
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full mb-3" />
      <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
    </div>
  );
}

export default function ActivityProgressCard({
  profileId,
  initialCount,
  isPro,
  initialDiscount,
  initialApplied,
}: {
  profileId: string | null;
  initialCount?: { posts: number; comments: number; total: number };
  isPro?: boolean;
  initialDiscount?: UserDiscount | null;
  initialApplied?: boolean;
}) {
  const { total, isLoading } = useActivityProgress(profileId, initialCount);

  const [discount, setDiscount] = useState<UserDiscount | null>(initialDiscount ?? null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(initialApplied ?? false);

  if (!profileId) return null;
  if (isLoading) return <ProgressSkeleton />;

  const pct = Math.min((total / GOAL) * 100, 100);
  const isDone = total >= GOAL;

  async function handleClaim() {
    if (!profileId) return;
    setClaiming(true);
    setClaimError(null);
    const result = await redeemActivityDiscount();
    if ('couponCode' in result) {
      // Merge the new coupon into the existing row, or build a synthetic minimal row
      // if this is the first claim (server creates the row on demand).
      setDiscount((prev) =>
        prev
          ? { ...prev, couponCode: result.couponCode, expiresAt: result.expiresAt }
          : {
              id: '',
              userId: '',
              discountType: 'activity',
              milestoneId: '__none__',
              discountPct: 15,
              used: false,
              couponCode: result.couponCode,
              generatedAt: new Date().toISOString(),
              expiresAt: result.expiresAt,
              achievedAt: null,
              revertSubscriptionId: null,
              revertNormalVariantId: null,
              revertDiscountedVariantId: null,
              revertAppliedAt: null,
              revertAttempts: 0,
            },
      );
    } else {
      setClaimError(result.error);
    }
    setClaiming(false);
  }

  async function handleApply() {
    setApplyLoading(true);
    setApplyError(null);
    const result = await applyDiscountToSubscription('activity');
    if ('success' in result) {
      setApplySuccess(true);
    } else {
      setApplyError(result.error);
    }
    setApplyLoading(false);
  }

  function handleCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className={cn(FEED_CARD_SURFACE_CLASS, 'p-4')}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shrink-0">
          <Trophy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
        </div>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex-1">Rank Up</p>
        {!isDone && (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
            {total}/{GOAL}
          </span>
        )}
      </div>

      {isDone ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
            <span className="font-medium">15% PRO discount earned!</span>
          </div>

          {isPro ? (
            // PRO users: apply discount directly to subscription
            discount?.used || applySuccess ? (
              applySuccess ? (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  ✓ Discount applied — activates on your next billing cycle
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">Discount already used.</p>
              )
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-3 cursor-pointer rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/70"
                  disabled={applyLoading}
                  onClick={handleApply}
                >
                  {applyLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Apply to my subscription
                </Button>
                {applyError && <p className="text-xs text-rose-500">{applyError}</p>}
              </>
            )
          ) : (
            // Free users: coupon code flow
            discount?.couponCode ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="inline-flex items-center h-7 text-xs font-mono px-3 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 select-all tracking-wider">
                    {discount.couponCode}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-3 cursor-pointer rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/70"
                    onClick={() => handleCopy(discount.couponCode!)}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                {discount.expiresAt && (
                  <ExpiryCountdown expiresAt={discount.expiresAt} />
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Enter this code at checkout when upgrading to PRO.{' '}
                  <a href="/settings?tab=billing" className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300">
                    Upgrade now →
                  </a>
                </p>
              </div>
            ) : discount?.used ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">Discount already used.</p>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-3 cursor-pointer rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/70"
                  disabled={claiming}
                  onClick={handleClaim}
                >
                  {claiming ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Get coupon code
                </Button>
                {claimError && <p className="text-xs text-rose-500">{claimError}</p>}
              </>
            )
          )}
        </div>
      ) : (
        <>
          {/* Progress bar with milestone ticks */}
          <div className="relative mb-1">
            <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {MILESTONES.map((m) => (
              <div
                key={m}
                className={cn(
                  'absolute top-0 -translate-x-px w-0.5 h-2.5 rounded-full',
                  total >= m
                    ? 'bg-amber-700 dark:bg-amber-300'
                    : 'bg-slate-300 dark:bg-slate-600',
                )}
                style={{ left: `${(m / GOAL) * 100}%` }}
              />
            ))}
          </div>

          {/* Milestone labels */}
          <div className="relative h-4 mb-2">
            {MILESTONE_LABELS.map((m) => (
              <span
                key={m}
                className={cn(
                  'absolute text-[10px] text-slate-400 dark:text-slate-500',
                  m === GOAL ? 'right-0' : '-translate-x-1/2',
                )}
                style={m === GOAL ? undefined : { left: `${(m / GOAL) * 100}%` }}
              >
                {m}
              </span>
            ))}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Earn 15% off PRO at 300 posts &amp; comments
          </p>
        </>
      )}
    </div>
  );
}
