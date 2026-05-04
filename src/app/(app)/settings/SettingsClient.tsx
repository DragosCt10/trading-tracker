'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useMemo, useState, useTransition } from 'react';
import { Award, CreditCard, Link2, Loader2, Settings, Star, User, Users } from 'lucide-react';
import { PanelSkeleton } from '@/components/settings/PanelSkeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// Tab panels are lazy-loaded so users viewing one tab don't download the other
// two tabs' JavaScript upfront. Chunk-load failures are caught by the scoped
// error.tsx boundary in this route (prevents infinite-skeleton state). SSR is
// enabled so the active tab renders server-side for LCP parity with the
// original static import.
const BillingSettingsPanel = dynamic(
  () =>
    import('@/components/settings/BillingSettingsPanel').then((m) => ({
      default: m.BillingSettingsPanel,
    })),
  { loading: () => <PanelSkeleton />, ssr: true }
);
const ProfileSettingsPanel = dynamic(
  () => import('@/components/settings/ProfileSettingsPanel'),
  { loading: () => <PanelSkeleton />, ssr: true }
);
const ReviewSection = dynamic(() => import('@/components/settings/ReviewSection'), {
  loading: () => <PanelSkeleton />,
  ssr: true,
});
const SharedTradesPanel = dynamic(() => import('@/components/settings/SharedTradesPanel'), {
  loading: () => <PanelSkeleton />,
  ssr: true,
});
const CustomFuturesSpecsPanel = dynamic(
  () => import('@/components/settings/CustomFuturesSpecsPanel'),
  { loading: () => <PanelSkeleton />, ssr: false },
);
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ResolvedSubscription } from '@/types/subscription';
import type { SocialProfile } from '@/types/social';
import { updateEmailAction, updatePasswordAction } from '@/lib/server/auth';
import { persistNewsletterPreference, updateTradeTimeFormat } from '@/lib/server/settings';
import type { TradeTimeFormat } from '@/types/featureFlags';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { PASSWORD_RULES, getPasswordStrength } from '@/utils/passwordValidation';
import type { SettingsTab } from './page';

interface SettingsClientProps {
  initialTab: SettingsTab;
  subscription: ResolvedSubscription;
  justPaid: boolean;
  featureContext?: string;
  userEmail: string;
  userId: string;
  socialProfile: SocialProfile | null;
  initialNewsletterSubscribed: boolean;
  initialTradeTimeFormat: TradeTimeFormat;
}

export default function SettingsClient({
  initialTab,
  subscription,
  justPaid,
  featureContext,
  userEmail,
  userId,
  socialProfile,
  initialNewsletterSubscribed,
  initialTradeTimeFormat,
}: SettingsClientProps) {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState(userEmail);
  const [emailError, setEmailError] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [isEmailPending, startEmailTransition] = useTransition();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isPasswordPending, startPasswordTransition] = useTransition();

  const [newsletterSubscribed, setNewsletterSubscribed] = useState(initialNewsletterSubscribed);
  const [newsletterMessage, setNewsletterMessage] = useState('');
  const [isNewsletterPending, startNewsletterTransition] = useTransition();

  const [tradeTimeFormat, setTradeTimeFormat] = useState<TradeTimeFormat>(initialTradeTimeFormat);
  const [tradeTimeMessage, setTradeTimeMessage] = useState('');
  const [isTradeTimePending, startTradeTimeTransition] = useTransition();

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const allRulesPassed = passwordStrength === PASSWORD_RULES.length;
  const passwordsMatch = password === confirmPassword;

  const navItemClass = (active: boolean) =>
    cn(
      'w-full justify-start h-11 rounded-xl border transition-all duration-200',
      'border-slate-200/70 dark:border-slate-700/60',
      'bg-transparent text-slate-700 hover:text-slate-900 hover:bg-slate-100/70',
      'dark:text-slate-200 dark:hover:text-slate-50 dark:hover:bg-slate-800/60',
      active && 'themed-nav-active'
    );

  function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalizedEmail = newEmail.trim();

    setEmailError('');
    setEmailMessage('');

    if (!normalizedEmail) {
      setEmailError('Please enter an email address.');
      return;
    }
    if (normalizedEmail === userEmail) {
      setEmailError('Please enter a different email address.');
      return;
    }

    startEmailTransition(async () => {
      const formData = new FormData();
      formData.set('email', normalizedEmail);
      const result = await updateEmailAction(null, formData);
      if (result.error) {
        setEmailError(result.error);
        return;
      }
      setEmailMessage('Email update requested. Please check your inbox to confirm the new address.');
    });
  }

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (!allRulesPassed) {
      setPasswordError('Please meet all password requirements before submitting.');
      return;
    }
    if (!passwordsMatch) {
      setPasswordError('Passwords do not match.');
      return;
    }

    startPasswordTransition(async () => {
      const formData = new FormData();
      formData.set('password', password);
      const result = await updatePasswordAction(null, formData);
      if (result.error) {
        setPasswordError(result.error);
        return;
      }
      setPasswordMessage('Password updated successfully.');
      setPassword('');
      setConfirmPassword('');
      setConfirmTouched(false);
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-0">
      <div className="space-y-2 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl shadow-sm themed-header-icon-box">
              <Settings className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Manage your account.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav
          aria-label="Settings sections"
          className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-3 h-fit"
        >
          <div className="space-y-2">
            <Button asChild variant="ghost" className={navItemClass(initialTab === 'billing')}>
              <Link
                href="/settings?tab=billing"
                aria-current={initialTab === 'billing' ? 'page' : undefined}
              >
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                Billing
              </Link>
            </Button>
            <Button asChild variant="ghost" className={navItemClass(initialTab === 'account')}>
              <Link
                href="/settings?tab=account"
                aria-current={initialTab === 'account' ? 'page' : undefined}
              >
                <User className="h-4 w-4" aria-hidden="true" />
                Account
              </Link>
            </Button>
            <Button asChild variant="ghost" className={navItemClass(initialTab === 'profile')}>
              <Link
                href="/settings?tab=profile"
                aria-current={initialTab === 'profile' ? 'page' : undefined}
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                Profile
              </Link>
            </Button>
            <Button asChild variant="ghost" className={navItemClass(initialTab === 'sharedTrades')}>
              <Link
                href="/settings?tab=sharedTrades"
                aria-current={initialTab === 'sharedTrades' ? 'page' : undefined}
              >
                <Link2 className="h-4 w-4" aria-hidden="true" />
                Shared Trades
              </Link>
            </Button>
            <Button asChild variant="ghost" className={navItemClass(initialTab === 'review')}>
              <Link
                href="/settings?tab=review"
                aria-current={initialTab === 'review' ? 'page' : undefined}
              >
                <Star className="h-4 w-4" aria-hidden="true" />
                Leave a Review
              </Link>
            </Button>
            <Button asChild variant="ghost" className={navItemClass(false)}>
              <Link href="/rewards?from=settings">
                <Award className="h-4 w-4" aria-hidden="true" />
                Rewards
              </Link>
            </Button>
          </div>
        </nav>

        <section className="min-w-0">
          {initialTab === 'billing' ? (
            <BillingSettingsPanel
              initialSubscription={subscription}
              justPaid={justPaid}
              featureContext={featureContext}
            />
          ) : initialTab === 'profile' ? (
            <ProfileSettingsPanel initialProfile={socialProfile} />
          ) : initialTab === 'review' ? (
            <ReviewSection socialProfile={socialProfile} />
          ) : initialTab === 'sharedTrades' ? (
            <SharedTradesPanel userId={userId} />
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">
                  Email
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Change the email address used for your account.
                </p>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="current-email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Current email
                    </Label>
                    <Input
                      id="current-email"
                      name="current-email"
                      value={userEmail}
                      readOnly
                      className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 opacity-80"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="new-email"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      New email
                    </Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>

                  {emailError ? <p className="text-sm text-rose-500">{emailError}</p> : null}
                  {emailMessage ? <p className="text-sm text-green-500">{emailMessage}</p> : null}

                  <Button
                    type="submit"
                    disabled={isEmailPending}
                    className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60 [&_svg]:text-white"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                      {isEmailPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isEmailPending ? 'Updating email...' : 'Update email'}
                    </span>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  </Button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">
                  Password
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Set a strong password to secure your account.
                </p>

                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="new-password"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      New password
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                  {password.length > 0 ? (
                    <ul className="space-y-1">
                      {PASSWORD_RULES.map((rule) => {
                        const passed = rule.test(password);
                        return (
                          <li key={rule.label} className="text-xs">
                            <span className={passed ? 'text-green-500' : 'text-slate-500'}>
                              {passed ? '✓' : '○'} {rule.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="confirm-password"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Confirm password
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onBlur={() => setConfirmTouched(true)}
                      className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      required
                    />
                  </div>
                  {confirmTouched && confirmPassword.length > 0 && !passwordsMatch ? (
                    <p className="text-xs text-rose-500">Passwords do not match.</p>
                  ) : null}

                  {passwordError ? <p className="text-sm text-rose-500">{passwordError}</p> : null}
                  {passwordMessage ? (
                    <p className="text-sm text-green-500">{passwordMessage}</p>
                  ) : null}

                  <Button
                    type="submit"
                    disabled={isPasswordPending || !allRulesPassed || !passwordsMatch}
                    className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60 [&_svg]:text-white"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
                      {isPasswordPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {isPasswordPending ? 'Updating password...' : 'Update password'}
                    </span>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
                  </Button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">
                  Newsletter
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Manage your newsletter subscription.
                </p>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="newsletter-toggle"
                    checked={newsletterSubscribed}
                    disabled={isNewsletterPending}
                    onCheckedChange={(checked) => {
                      const value = !!checked;
                      setNewsletterSubscribed(value);
                      setNewsletterMessage('');
                      startNewsletterTransition(async () => {
                        const result = await persistNewsletterPreference(value);
                        if (result.error) {
                          setNewsletterSubscribed(!value);
                          setNewsletterMessage('Failed to update preference.');
                        } else {
                          setNewsletterMessage(
                            value ? 'Subscribed to newsletter.' : 'Unsubscribed from newsletter.'
                          );
                        }
                      });
                    }}
                    className="themed-checkbox h-5 w-5 rounded-md shadow-sm cursor-pointer border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 transition-colors duration-150 data-[state=checked]:!text-white"
                  />
                  <Label htmlFor="newsletter-toggle" className="text-sm font-normal cursor-pointer text-slate-700 dark:text-slate-300 select-none">
                    Subscribe to newsletter
                  </Label>
                  {isNewsletterPending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : null}
                </div>

                {newsletterMessage ? (
                  <p className="mt-3 text-sm text-green-500">{newsletterMessage}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">
                  Trade Time Format
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
                  Choose how you log the time of each trade. Existing trades are unaffected.
                </p>

                <div role="radiogroup" aria-label="Trade time format" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {([
                    { value: 'exact' as const, label: 'Exact time', hint: 'Free-form HH:MM picker (current default).' },
                    { value: 'interval' as const, label: 'Time interval', hint: '2-hour buckets (legacy).' },
                  ]).map((opt) => {
                    const selected = tradeTimeFormat === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={isTradeTimePending}
                        onClick={() => {
                          if (selected || isTradeTimePending) return;
                          const previous = tradeTimeFormat;
                          setTradeTimeFormat(opt.value);
                          setTradeTimeMessage('');
                          startTradeTimeTransition(async () => {
                            const result = await updateTradeTimeFormat(opt.value);
                            if (result.error) {
                              setTradeTimeFormat(previous);
                              setTradeTimeMessage('Failed to update preference.');
                              return;
                            }
                            void queryClient.invalidateQueries({ queryKey: queryKeys.settings(userId) });
                            setTradeTimeMessage(
                              opt.value === 'exact'
                                ? 'Switched to exact time picker.'
                                : 'Switched to time interval buckets.',
                            );
                          });
                        }}
                        className={cn(
                          'text-left rounded-2xl border p-4 transition-all duration-200 cursor-pointer',
                          'border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30',
                          'hover:bg-slate-100/70 dark:hover:bg-slate-800/60',
                          'disabled:opacity-60 disabled:cursor-not-allowed',
                          selected && 'themed-nav-active border-transparent',
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                            {opt.label}
                          </span>
                          {selected ? (
                            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500">
                              Selected
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{opt.hint}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2 min-h-5">
                  {isTradeTimePending ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : null}
                  {tradeTimeMessage ? (
                    <p className="text-sm text-green-500">{tradeTimeMessage}</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
                <CustomFuturesSpecsPanel />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
