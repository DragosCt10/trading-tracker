'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, Check, ChevronRight, Copy, Lock, Loader2, Trophy, ShieldCheck } from 'lucide-react';
import {
  TRADE_MILESTONES,
  getMilestoneForCount,
  getNextMilestone,
  getBadgeInlineStyle,
  type TradeMilestone,
  type TradeMilestoneId,
} from '@/constants/tradeMilestones';
import { redeemMilestoneDiscount, redeemProRetentionDiscount, applyDiscountToSubscription } from '@/lib/server/rewards';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { monthsSince } from '@/utils/helpers/dateHelpers';
import type { UserDiscount } from '@/types/userDiscount';

interface RewardsClientProps {
  totalTrades: number;
  milestoneDiscounts: UserDiscount[];
  retentionDiscount: UserDiscount | null;
  pendingRevertDiscountId: string | null;
  isPro: boolean;
  proSinceDate: string | null;
  showBackToSettings?: boolean;
}

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

function CouponCodeDisplay({
  code,
  isCopied,
  onCopy,
}: {
  code: string;
  isCopied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <code className="inline-flex items-center h-7 text-xs font-mono px-3 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 select-all tracking-wider">
        {code}
      </code>
      <Button
        size="sm"
        variant="outline"
        aria-label={isCopied ? 'Copied to clipboard' : `Copy coupon code ${code}`}
        className="h-7 text-xs px-3 cursor-pointer rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/70"
        onClick={onCopy}
      >
        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {isCopied ? 'Copied!' : 'Copy'}
      </Button>
    </div>
  );
}

export default function RewardsClient({
  totalTrades,
  milestoneDiscounts,
  retentionDiscount: initialRetentionDiscount,
  pendingRevertDiscountId,
  isPro,
  proSinceDate,
  showBackToSettings,
}: RewardsClientProps) {
  const currentMilestone = getMilestoneForCount(totalTrades);
  const nextMilestone = getNextMilestone(totalTrades);
  const [discounts, setDiscounts] = useState<UserDiscount[]>(milestoneDiscounts);
  const [claimErrors, setClaimErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // Apply-to-subscription state (keyed by discountId: milestoneId or 'retention')
  const [applyLoading, setApplyLoading] = useState<string | null>(null);
  const [applyErrors, setApplyErrors] = useState<Record<string, string>>({});
  // Seed from the pending revert so "Discount applied" persists across page refreshes
  const [applySuccess, setApplySuccess] = useState<Set<string>>(
    pendingRevertDiscountId ? new Set([pendingRevertDiscountId]) : new Set(),
  );

  // PRO retention discount state
  const [retentionDiscount, setRetentionDiscount] = useState<UserDiscount | null>(
    initialRetentionDiscount,
  );
  const [retentionClaiming, setRetentionClaiming] = useState(false);
  const [retentionError, setRetentionError] = useState<string | null>(null);
  const [retentionCopied, setRetentionCopied] = useState(false);

  const proMonths = proSinceDate ? monthsSince(proSinceDate) : 0;
  const retentionUnlocked = isPro && proMonths >= 3;

  async function handleRetentionClaim() {
    setRetentionClaiming(true);
    setRetentionError(null);
    const result = await redeemProRetentionDiscount();
    if ('couponCode' in result) {
      // Merge the new coupon into the existing row, or build a minimal synthetic row
      // if this is the first claim (server creates the row on demand).
      setRetentionDiscount((prev) =>
        prev
          ? { ...prev, couponCode: result.couponCode, expiresAt: result.expiresAt }
          : {
              id: '',
              userId: '',
              discountType: 'retention',
              milestoneId: '__none__',
              discountPct: 10,
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
      setRetentionError(result.error);
    }
    setRetentionClaiming(false);
  }

  async function handleApplyDiscount(discountId: string) {
    setApplyLoading(discountId);
    setApplyErrors((prev) => { const next = { ...prev }; delete next[discountId]; return next; });
    const result = await applyDiscountToSubscription(discountId as TradeMilestoneId | 'retention' | 'activity');
    if ('success' in result) {
      setApplySuccess((prev) => new Set([...prev, discountId]));
    } else {
      setApplyErrors((prev) => ({ ...prev, [discountId]: result.error }));
    }
    setApplyLoading(null);
  }

  function handleRetentionCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setRetentionCopied(true);
      setTimeout(() => setRetentionCopied(false), 2000);
    }).catch(() => {
      // Clipboard API unavailable (insecure context or permission denied)
      // No-op: user can manually select the code (select-all on the code element)
    });
  }

  async function handleClaim(milestoneId: TradeMilestoneId) {
    setClaimingId(milestoneId);
    setClaimErrors((prev) => { const next = { ...prev }; delete next[milestoneId]; return next; });
    try {
      const result = await redeemMilestoneDiscount(milestoneId);
      if ('couponCode' in result) {
        setDiscounts((prev) =>
          prev.map((d) => (d.milestoneId === milestoneId ? { ...d, couponCode: result.couponCode, expiresAt: result.expiresAt } : d)),
        );
      } else {
        setClaimErrors((prev) => ({ ...prev, [milestoneId]: result.error }));
      }
    } finally {
      setClaimingId(null);
    }
  }

  function handleCopy(milestoneId: string, code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedId(milestoneId);
      setTimeout(() => setCopiedId((id) => (id === milestoneId ? null : id)), 2000);
    }).catch(() => {
      // Clipboard API unavailable — user can manually select the code
    });
  }

  const progressPct = nextMilestone
    ? Math.min(100, Math.round(((totalTrades - (currentMilestone?.minTrades ?? 0)) / (nextMilestone.minTrades - (currentMilestone?.minTrades ?? 0))) * 100))
    : 100;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
      {/* Back to Settings */}
      {showBackToSettings && (
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Link>
      )}

      {/* Header */}
      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
              Trade Rewards
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Earn badges and unlock PRO discounts as you hit trade milestones.
            </p>
          </div>
        </div>
      </div>

      {/* Current Status Card */}
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/30 backdrop-blur-sm p-6 mb-6">
        {currentMilestone ? (
          <div className="flex items-center gap-4">
            <MilestoneBadgeLarge milestone={currentMilestone} />
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">{currentMilestone.badgeName}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{totalTrades} trades completed</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Trophy className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Start trading to earn your first badge!</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {totalTrades} / 100 trades — {100 - totalTrades} more to Rookie Trader
            </p>
          </div>
        )}

        {/* Progress to next milestone */}
        {nextMilestone && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
              <span>{totalTrades} trades</span>
              <span className="flex items-center gap-1">
                {nextMilestone.badgeName}
                <ChevronRight className="h-3 w-3" />
                {nextMilestone.minTrades}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progress to ${nextMilestone.badgeName}`}
                className="h-full rounded-full transition-transform duration-500 origin-left bg-slate-500 dark:bg-slate-400"
                style={{ transform: `scaleX(${progressPct / 100})` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* PRO Loyalty Reward */}
      {isPro && (
        <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/30 backdrop-blur-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">PRO Loyalty Reward</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Stay on PRO for 3 months · 10% off your next billing cycle</p>
            </div>
          </div>

          {!retentionUnlocked && (
            <div className="mt-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                <span>{proMonths} month{proMonths !== 1 ? 's' : ''} on PRO</span>
                <span>3 months</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div
                  role="progressbar"
                  aria-valuenow={Math.min(100, Math.round((proMonths / 3) * 100))}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="PRO loyalty progress"
                  className="h-full rounded-full transition-transform duration-500 origin-left bg-amber-500 dark:bg-amber-400"
                  style={{ transform: `scaleX(${Math.min(1, proMonths / 3)})` }}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {3 - proMonths} more month{3 - proMonths !== 1 ? 's' : ''} to unlock
              </p>
            </div>
          )}

          {retentionUnlocked && (
            <div className="space-y-2">
              {retentionDiscount?.couponCode ? (
                <div className="space-y-2">
                  <CouponCodeDisplay
                    code={retentionDiscount.couponCode}
                    isCopied={retentionCopied}
                    onCopy={() => handleRetentionCopy(retentionDiscount.couponCode!)}
                  />
                  {retentionDiscount.expiresAt && (
                    <ExpiryCountdown expiresAt={retentionDiscount.expiresAt} />
                  )}
                  <ApplyDiscountSection
                    isLoading={applyLoading === 'retention'}
                    isApplied={applySuccess.has('retention')}
                    error={applyErrors['retention']}
                    onApply={() => handleApplyDiscount('retention')}
                  />
                </div>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-3 cursor-pointer rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/70"
                    disabled={retentionClaiming}
                    onClick={handleRetentionClaim}
                  >
                    {retentionClaiming ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Get coupon code
                  </Button>
                  {retentionError && <p role="alert" className="text-xs text-rose-500">{retentionError}</p>}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/30 backdrop-blur-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-5">Milestones</h2>
        <div className="space-y-0">
          {TRADE_MILESTONES.map((milestone, i) => {
            const achieved = totalTrades >= milestone.minTrades;
            const isCurrent = currentMilestone?.id === milestone.id;
            const discount = discounts.find((d) => d.milestoneId === milestone.id);
            const isLast = i === TRADE_MILESTONES.length - 1;
            const canClaim = achieved && discount && !discount.used && !discount.couponCode;
            const isClaiming = claimingId === milestone.id;
            const claimError = claimErrors[milestone.id];

            return (
              <div key={milestone.id} className="flex gap-4">
                {/* Timeline line + dot */}
                <div className="flex flex-col items-center">
                  <div
                    aria-label={achieved ? 'Achieved' : 'Locked'}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border',
                      !achieved && 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600',
                      isCurrent && 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-slate-900/20 dark:ring-slate-100/20',
                    )}
                    style={achieved ? getBadgeInlineStyle(milestone.id) : undefined}
                  >
                    {achieved ? <Check className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                  </div>
                  {!isLast && (
                    <div className={cn('w-px flex-1 min-h-[2rem]', achieved ? 'bg-slate-300 dark:bg-slate-600' : 'bg-slate-200 dark:bg-slate-700')} />
                  )}
                </div>

                {/* Content */}
                <div className={cn('pb-6 flex-1', !achieved && 'opacity-50')}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{milestone.badgeName}</p>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {milestone.minTrades}{milestone.maxTrades ? `–${milestone.maxTrades}` : '+'} trades
                    </span>
                  </div>
                  <div className="mt-1 space-y-1.5">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {milestone.discountPct}% PRO discount
                      {discount?.used && ' — Used'}
                    </p>
                    {/* Coupon code display */}
                    {discount?.couponCode && (
                      <div className="space-y-2">
                        <CouponCodeDisplay
                          code={discount.couponCode}
                          isCopied={copiedId === milestone.id}
                          onCopy={() => handleCopy(milestone.id, discount.couponCode!)}
                        />
                        {discount.expiresAt && (
                          <ExpiryCountdown expiresAt={discount.expiresAt} />
                        )}
                        {isPro ? (
                          <ApplyDiscountSection
                            isLoading={applyLoading === milestone.id}
                            isApplied={applySuccess.has(milestone.id)}
                            error={applyErrors[milestone.id]}
                            onApply={() => handleApplyDiscount(milestone.id)}
                          />
                        ) : (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Enter this code at checkout when upgrading to PRO.{' '}
                            <a href="/settings?tab=billing" className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300">
                              Upgrade now →
                            </a>
                          </p>
                        )}
                      </div>
                    )}
                    {/* Claim button */}
                    {canClaim && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-3 cursor-pointer rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/70"
                        disabled={isClaiming}
                        onClick={() => handleClaim(milestone.id as TradeMilestoneId)}
                      >
                        {isClaiming ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Get coupon code
                      </Button>
                    )}
                    {claimError && (
                      <p role="alert" className="text-xs text-rose-500">{claimError}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badge Gallery */}
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/30 backdrop-blur-sm p-6 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">Badge Gallery</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TRADE_MILESTONES.map((milestone) => {
            const achieved = totalTrades >= milestone.minTrades;
            return (
              <div
                key={milestone.id}
                className={cn(
                  'rounded-xl border p-3 text-center transition-all',
                  !achieved && 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 opacity-40',
                )}
                style={achieved ? getBadgeInlineStyle(milestone.id) : undefined}
              >
                <Award aria-hidden="true" className="mx-auto h-6 w-6 mb-1.5" />
                <p className="text-xs font-semibold">
                  {milestone.badgeName}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {milestone.minTrades}+ trades
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Discount Info */}
      <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/30 backdrop-blur-sm p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-3">How Discounts Work</h2>
        <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
            Each milestone unlocks a one-time discount for your PRO subscription.
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
            Already on PRO? Click &ldquo;Apply to my subscription&rdquo; to get the discount on your next billing cycle — no cancellation needed.
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
            Not yet on PRO? Copy the code and enter it at checkout when upgrading.
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
            Discounts are not accumulated — each can be used once, independently.
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
            All trade modes (live, demo, backtesting) count toward milestones.
          </li>
          <li className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-0.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
            Badges are displayed next to your name on Feed posts.
          </li>
        </ul>
      </div>
    </div>
  );
}

function ApplyDiscountSection({
  isLoading,
  isApplied,
  error,
  onApply,
}: {
  isLoading: boolean;
  isApplied: boolean;
  error?: string;
  onApply: () => void;
}) {
  if (isApplied) {
    return (
      <p role="status" className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
        <Check className="h-3 w-3" />
        Discount applied — activates on your next billing cycle
      </p>
    );
  }
  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs px-3 cursor-pointer rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/70"
        disabled={isLoading}
        onClick={onApply}
      >
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Apply to my subscription
      </Button>
      {error && <p role="alert" className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}

function MilestoneBadgeLarge({ milestone }: { milestone: TradeMilestone }) {
  return (
    <div
      className="w-14 h-14 rounded-2xl flex items-center justify-center border"
      style={getBadgeInlineStyle(milestone.id)}
    >
      <Award className="h-7 w-7" />
    </div>
  );
}
