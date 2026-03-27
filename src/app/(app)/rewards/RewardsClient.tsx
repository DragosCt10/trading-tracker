'use client';

import { useState } from 'react';
import { Award, Check, ChevronRight, Copy, Lock, Loader2, Trophy, ShieldCheck } from 'lucide-react';
import {
  TRADE_MILESTONES,
  getMilestoneForCount,
  getNextMilestone,
  getBadgeInlineStyle,
  type TradeMilestone,
  type TradeMilestoneId,
} from '@/constants/tradeMilestones';
import { redeemMilestoneDiscount, redeemProRetentionDiscount } from '@/lib/server/rewards';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { monthsSince } from '@/utils/helpers/dateHelpers';

interface RewardsClientProps {
  totalTrades: number;
  featureFlags: Record<string, unknown>;
  isPro: boolean;
  portalUrl: string | null;
  proSinceDate: string | null;
}

interface DiscountEntry {
  milestoneId: string;
  discountPct: number;
  used: boolean;
  couponCode?: string;
}

interface ProRetentionDiscount {
  used: boolean;
  couponCode?: string;
}

export default function RewardsClient({ totalTrades, featureFlags, isPro, portalUrl, proSinceDate }: RewardsClientProps) {
  const currentMilestone = getMilestoneForCount(totalTrades);
  const nextMilestone = getNextMilestone(totalTrades);
  const [discounts, setDiscounts] = useState<DiscountEntry[]>(
    Array.isArray(featureFlags.available_discounts)
      ? (featureFlags.available_discounts as DiscountEntry[])
      : [],
  );
  const [claimErrors, setClaimErrors] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  // PRO retention discount state
  const initialRetention = featureFlags.pro_retention_discount as ProRetentionDiscount | undefined;
  const [retentionDiscount, setRetentionDiscount] = useState<ProRetentionDiscount | null>(initialRetention ?? null);
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
      setRetentionDiscount({ used: false, couponCode: result.couponCode });
    } else {
      setRetentionError(result.error);
    }
    setRetentionClaiming(false);
  }

  function handleRetentionCopy(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setRetentionCopied(true);
      setTimeout(() => setRetentionCopied(false), 2000);
    });
  }

  async function handleClaim(milestoneId: TradeMilestoneId) {
    setClaimingId(milestoneId);
    setClaimErrors((prev) => { const next = { ...prev }; delete next[milestoneId]; return next; });
    try {
      const result = await redeemMilestoneDiscount(milestoneId);
      if ('couponCode' in result) {
        setDiscounts((prev) =>
          prev.map((d) => (d.milestoneId === milestoneId ? { ...d, couponCode: result.couponCode } : d)),
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
    });
  }

  const progressPct = nextMilestone
    ? Math.min(100, Math.round(((totalTrades - (currentMilestone?.minTrades ?? 0)) / (nextMilestone.minTrades - (currentMilestone?.minTrades ?? 0))) * 100))
    : 100;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-0">
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
                className="h-full rounded-full transition-all duration-500 bg-slate-500 dark:bg-slate-400"
                style={{ width: `${progressPct}%` }}
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
                  className="h-full rounded-full transition-all duration-500 bg-amber-500 dark:bg-amber-400"
                  style={{ width: `${Math.min(100, Math.round((proMonths / 3) * 100))}%` }}
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="inline-flex items-center h-7 text-xs font-mono px-3 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 select-all tracking-wider">
                      {retentionDiscount.couponCode}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs px-3 cursor-pointer rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/70"
                      onClick={() => handleRetentionCopy(retentionDiscount.couponCode!)}
                    >
                      {retentionCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {retentionCopied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  {portalUrl ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      <a href={portalUrl} className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300">
                        Apply in billing portal →
                      </a>
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enter this code at checkout.{' '}
                      <a href="/settings?tab=billing" className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300">
                        Go to billing →
                      </a>
                    </p>
                  )}
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
                  {retentionError && <p className="text-xs text-rose-500">{retentionError}</p>}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="inline-flex items-center h-7 text-xs font-mono px-3 rounded-xl bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 select-all tracking-wider">
                            {discount.couponCode}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-3 cursor-pointer rounded-xl gap-1.5 border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-800/70"
                            onClick={() => handleCopy(milestone.id, discount.couponCode!)}
                          >
                            {copiedId === milestone.id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                            {copiedId === milestone.id ? 'Copied!' : 'Copy'}
                          </Button>
                        </div>
                        {isPro ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            You&apos;re already PRO.{' '}
                            {portalUrl ? (
                              <a href={portalUrl} className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300">
                                Apply in billing portal →
                              </a>
                            ) : (
                              <a href="/settings?tab=billing" className="underline underline-offset-2 hover:text-slate-700 dark:hover:text-slate-300">
                                Go to billing settings → Manage subscription
                              </a>
                            )}
                          </p>
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
                      <p className="text-xs text-rose-500">{claimError}</p>
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
                <Award className="mx-auto h-6 w-6 mb-1.5" />
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
            <span className="mt-0.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
            Each milestone unlocks a one-time discount on a PRO subscription.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
            Discounts are not accumulated — each can be used once, independently.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
            All trade modes (live, demo, backtesting) count toward milestones.
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
            Badges are displayed next to your name on Feed posts.
          </li>
        </ul>
      </div>
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
