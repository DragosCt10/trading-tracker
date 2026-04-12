'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Handshake,
  Loader2,
  Percent,
  Timer,
  Wallet,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

// Source of truth for the public numbers displayed on the page.
// These MUST match what is configured inside the Lemon Squeezy affiliate program
// dashboard — they are the public promise to applicants. Update both in lockstep.
const AFFILIATE_PROGRAM = {
  commissionPercent: 30,
  cookieWindowDays: 60,
  // Lemon Squeezy bi-monthly schedule:
  //   Payouts created: 1st and 15th of each month
  //   Payouts paid:    14th and 28th of each month
  //   Holding period:  30 days before commissions become available
  payoutCadence: 'Bi-monthly',
} as const;

interface AffiliatesPageClientProps {
  prefillEmail: string | null;
  prefillName: string;
  /** True when the logged-in user is already an active affiliate. */
  isAffiliate: boolean;
  /** Direct link to the LS Affiliate Hub, only set when isAffiliate is true. */
  hubUrl: string | null;
}

type FormStatus = 'idle' | 'loading' | 'success' | 'error';

interface FieldErrors {
  name?: string;
  website?: string;
  audience?: string;
}

// Shared submit-button style, matching the gradient used by /contact and /pricing CTAs.
const CTA_GRADIENT_BG =
  'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))';
const CTA_GRADIENT_SHADOW =
  '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)';

// Auth-style input tokens. Mirrors the classes used in src/app/(auth-app)/login/LoginPage.tsx
// so every marketing/auth surface has a single consistent input language.
const INPUT_BASE =
  'h-12 rounded-2xl border backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300';
const INPUT_NEUTRAL =
  'border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30';
const INPUT_ERROR =
  'border-red-500/60 bg-red-500/5 focus-visible:ring-red-500/40';
const INPUT_DISABLED =
  'border-slate-200/70 dark:border-slate-700/50 bg-slate-100/60 dark:bg-slate-800/50 text-slate-500 dark:text-slate-500 cursor-not-allowed';

// Textarea has no fixed h-12 (grows with rows prop) but shares every other token.
const TEXTAREA_BASE =
  'rounded-2xl border backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300';

// Shared label styling to match auth forms.
const LABEL_CLASS = 'block text-sm font-semibold text-foreground';

export function AffiliatesPageClient({
  prefillEmail,
  prefillName,
  isAffiliate,
  hubUrl,
}: AffiliatesPageClientProps) {
  const isLoggedIn = prefillEmail !== null;

  const honeypotRef = useRef<HTMLInputElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const audienceInputRef = useRef<HTMLTextAreaElement>(null);

  const [name, setName] = useState(prefillName);
  const [website, setWebsite] = useState('');
  const [audience, setAudience] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [generalError, setGeneralError] = useState('');

  function validateClient(): FieldErrors {
    const errors: FieldErrors = {};
    if (!name.trim()) {
      errors.name = 'Name is required';
    } else if (name.length > 100) {
      errors.name = 'Name must be 100 characters or less';
    }
    if (website && website.length > 200) {
      errors.website = 'URL must be 200 characters or less';
    }
    const audienceTrimmed = audience.trim();
    if (!audienceTrimmed) {
      errors.audience = 'Tell us a bit about your audience';
    } else if (audienceTrimmed.length < 50) {
      errors.audience = 'Please write at least 50 characters';
    } else if (audienceTrimmed.length > 1000) {
      errors.audience = 'Must be 1000 characters or less';
    }
    return errors;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errors = validateClient();
    setFieldErrors(errors);
    setGeneralError('');
    if (Object.keys(errors).length > 0) {
      if (errors.name) nameInputRef.current?.focus();
      else if (errors.audience) audienceInputRef.current?.focus();
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/affiliates/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim(),
          audience: audience.trim(),
          website2: honeypotRef.current?.value || '',
        }),
      });

      if (res.status === 429) {
        setGeneralError('Please wait before sending another application.');
        setStatus('error');
        return;
      }

      if (res.status === 401) {
        setGeneralError('Your session has expired. Please log in again.');
        setStatus('error');
        return;
      }

      if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        if (data?.errors) {
          setFieldErrors(data.errors);
        } else {
          setGeneralError(data?.error || 'Please check your input and try again.');
        }
        setStatus('error');
        return;
      }

      if (!res.ok) {
        setGeneralError('Something went wrong. Please try again.');
        setStatus('error');
        return;
      }

      setStatus('success');
      setFieldErrors({});

      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', 'affiliate_application_submitted', { method: 'web' });
      }

      requestAnimationFrame(() => {
        successHeadingRef.current?.focus();
      });
    } catch {
      setGeneralError('Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  return (
    <section>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="relative mx-auto flex max-w-4xl flex-col items-center px-4 pt-30 sm:pt-40 pb-10 text-center">
        <div className="mb-5 inline-flex items-center gap-2.5 rounded-full border border-black/[0.07] dark:border-white/[0.12] bg-transparent px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Handshake className="h-3 w-3" style={{ color: 'var(--tc-primary)' }} />
          <span>Affiliate program</span>
        </div>

        <h1 className="text-3xl leading-[1.08] font-medium tracking-[-0.04em] text-balance sm:text-5xl">
          Earn when traders <br className="sm:hidden" />
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(to bottom, var(--foreground) 0%, var(--tc-accent) 100%)',
            }}
          >
            you know start tracking.
          </span>
        </h1>

        <p className="text-muted-foreground mt-4 max-w-2xl text-pretty">
          Share AlphaStats with your audience and earn a generous recurring commission on
          every subscription. Built for traders who already recommend it.
        </p>

        <div className="mt-8">
          <Button
            asChild
            size="lg"
            className="relative cursor-pointer overflow-hidden rounded-lg text-white font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-300 group h-11 px-6"
            style={{ background: CTA_GRADIENT_BG, boxShadow: CTA_GRADIENT_SHADOW }}
          >
            <a href="#apply">
              <span className="relative z-10 flex items-center gap-2">
                Apply to the program
                <ArrowRight className="h-4 w-4" />
              </span>
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
            </a>
          </Button>
        </div>
      </div>

      {/* ── 3 program stats ──────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 pb-12 sm:pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ProgramStat
            icon={<Percent className="h-4 w-4" />}
            value={`${AFFILIATE_PROGRAM.commissionPercent}%`}
            label="Recurring commission"
            detail="On every paid subscription your referral keeps."
          />
          <ProgramStat
            icon={<Timer className="h-4 w-4" />}
            value={`${AFFILIATE_PROGRAM.cookieWindowDays} days`}
            label="Cookie window"
            detail="Your referral converts any time within the window."
          />
          <ProgramStat
            icon={<Wallet className="h-4 w-4" />}
            value={AFFILIATE_PROGRAM.payoutCadence}
            label="Payouts"
            detail="Created on the 1st &amp; 15th, paid on the 14th &amp; 28th. 30-day holding period."
          />
        </div>
      </div>

      {/* ── Apply section ────────────────────────────────────────────────── */}
      <div id="apply" className="scroll-mt-24 relative mx-auto max-w-2xl px-4 sm:px-6 pb-16 sm:pb-24">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] text-foreground">
            {isAffiliate
              ? 'You’re already an affiliate'
              : isLoggedIn
                ? 'Apply to become an affiliate'
                : 'Ready to apply?'}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {isAffiliate
              ? 'Your affiliate account is active. Track clicks, referrals, and earnings in your Lemon Squeezy Affiliate Hub.'
              : isLoggedIn
                ? 'Tell us a bit about where you’ll promote AlphaStats. We review every application within 48 hours.'
                : 'Log in to your AlphaStats account first, then fill out a short application.'}
          </p>
        </div>

        <div className="rounded-2xl border border-black/[0.07] dark:border-white/[0.12] bg-transparent p-6 sm:p-8 transition-colors duration-200 hover:border-black/[0.12] dark:hover:border-white/[0.18]">
          {isLoggedIn && isAffiliate && hubUrl ? (
            // ── Already an active affiliate ────────────────────────────────
            <div className="flex flex-col items-center py-8 text-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
                  border: '1px solid rgba(16,185,129,0.3)',
                }}
              >
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-foreground">You’re active</h3>
              <p className="text-muted-foreground max-w-md">
                Everything you need — your unique referral link, clicks, conversions,
                earnings, payouts, and creatives — lives inside the Lemon Squeezy
                Affiliate Hub.
              </p>
              <Button
                asChild
                className="mt-2 relative cursor-pointer overflow-hidden rounded-lg text-white font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-300 group h-11 px-6"
                style={{ background: CTA_GRADIENT_BG, boxShadow: CTA_GRADIENT_SHADOW }}
              >
                <a href={hubUrl} target="_blank" rel="noopener noreferrer">
                  <span className="relative z-10 flex items-center gap-2">
                    Open your Affiliate Hub
                    <ExternalLink className="h-4 w-4" />
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
                </a>
              </Button>
              <p className="text-[11px] text-muted-foreground max-w-sm">
                Opens in a new tab. Sign in with the same email you use on AlphaStats.
              </p>
            </div>
          ) : !isLoggedIn ? (
            // ── Logged-out: centered CTA ───────────────────────────────────
            <div className="flex flex-col items-center py-8 text-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in oklab, var(--tc-primary) 20%, transparent), color-mix(in oklab, var(--tc-primary) 5%, transparent))',
                  border: '1px solid color-mix(in oklab, var(--tc-primary) 30%, transparent)',
                }}
              >
                <Handshake className="h-7 w-7" style={{ color: 'var(--tc-primary)' }} />
              </div>
              <h3 className="text-xl font-semibold text-foreground">Log in to apply</h3>
              <p className="text-muted-foreground max-w-sm">
                You need to be logged in to apply. It takes less than a minute — we’ll
                bring you right back here.
              </p>
              <Button
                asChild
                className="mt-2 relative cursor-pointer overflow-hidden rounded-lg text-white font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-300 group h-11 px-6"
                style={{ background: CTA_GRADIENT_BG, boxShadow: CTA_GRADIENT_SHADOW }}
              >
                <Link href="/login?redirectTo=%2Faffiliates%23apply">
                  <span className="relative z-10 flex items-center gap-2">
                    Log in to apply
                    <ArrowRight className="h-4 w-4" />
                  </span>
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
                </Link>
              </Button>
            </div>
          ) : status === 'success' ? (
            // ── Success state ──────────────────────────────────────────────
            <div
              className="flex flex-col items-center py-8 text-center gap-4"
              aria-live="polite"
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
                  border: '1px solid rgba(16,185,129,0.3)',
                }}
              >
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <h3
                ref={successHeadingRef}
                tabIndex={-1}
                className="text-xl font-semibold text-foreground outline-none"
              >
                Application received
              </h3>
              <p className="text-muted-foreground max-w-md">
                Thanks for applying. We review every application within 48 hours. Once
                approved, Lemon Squeezy will email you a link to your Affiliate Hub where
                you’ll track clicks, referrals, and earnings.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-2 cursor-pointer rounded-lg"
              >
                <a
                  href="https://docs.lemonsqueezy.com/help/affiliates/affiliate-hub"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  How the Affiliate Hub works
                  <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          ) : (
            // ── Logged-in: application form ───────────────────────────────
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {/* Honeypot — hidden from humans + keyboard + screen readers */}
              <div className="absolute opacity-0 h-0 w-0 overflow-hidden" aria-hidden="true">
                <label htmlFor="website2">Website (leave blank)</label>
                <input
                  ref={honeypotRef}
                  type="text"
                  id="website2"
                  name="website2"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              {/* Name + Email row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className={LABEL_CLASS}>
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    ref={nameInputRef}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setFieldErrors((p) => ({ ...p, name: undefined }));
                    }}
                    maxLength={100}
                    autoComplete="name"
                    aria-invalid={fieldErrors.name ? 'true' : undefined}
                    aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                    placeholder="Your name"
                    className={`${INPUT_BASE} ${fieldErrors.name ? INPUT_ERROR : INPUT_NEUTRAL}`}
                  />
                  {fieldErrors.name && (
                    <p id="name-error" className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className={LABEL_CLASS}>
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={prefillEmail ?? ''}
                    readOnly
                    disabled
                    autoComplete="email"
                    className={`${INPUT_BASE} ${INPUT_DISABLED}`}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Linked to your AlphaStats account.
                  </p>
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website" className={LABEL_CLASS}>
                  Website / primary channel{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="website"
                  type="url"
                  inputMode="url"
                  value={website}
                  onChange={(e) => {
                    setWebsite(e.target.value);
                    setFieldErrors((p) => ({ ...p, website: undefined }));
                  }}
                  maxLength={200}
                  autoComplete="url"
                  aria-invalid={fieldErrors.website ? 'true' : undefined}
                  aria-describedby={fieldErrors.website ? 'website-error' : undefined}
                  placeholder="https://twitter.com/yourhandle or your blog"
                  className={`${INPUT_BASE} ${fieldErrors.website ? INPUT_ERROR : INPUT_NEUTRAL}`}
                />
                {fieldErrors.website && (
                  <p id="website-error" className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {fieldErrors.website}
                  </p>
                )}
              </div>

              {/* Audience */}
              <div className="space-y-2">
                <Label htmlFor="audience" className={LABEL_CLASS}>
                  Your audience <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="audience"
                  ref={audienceInputRef}
                  value={audience}
                  onChange={(e) => {
                    setAudience(e.target.value);
                    setFieldErrors((p) => ({ ...p, audience: undefined }));
                  }}
                  maxLength={1000}
                  rows={5}
                  aria-invalid={fieldErrors.audience ? 'true' : undefined}
                  aria-describedby={
                    fieldErrors.audience ? 'audience-error' : 'audience-hint'
                  }
                  placeholder="Who will you share AlphaStats with? Tell us about your audience size, what you trade, and where you'll promote it."
                  className={`${TEXTAREA_BASE} ${fieldErrors.audience ? INPUT_ERROR : INPUT_NEUTRAL}`}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {fieldErrors.audience ? (
                    <p id="audience-error" className="text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fieldErrors.audience}
                    </p>
                  ) : (
                    <p id="audience-hint">50–1000 characters.</p>
                  )}
                  <span>{audience.length}/1000</span>
                </div>
              </div>

              {/* General error (aria-live region announces status to screen readers) */}
              <div aria-live="polite" className="empty:hidden">
                {generalError && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/10 backdrop-blur-sm px-4 py-3 text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {generalError}
                  </div>
                )}
              </div>

              {/* Submit — matches /contact submit button exactly */}
              <Button
                type="submit"
                disabled={status === 'loading'}
                className="relative w-full cursor-pointer overflow-hidden rounded-lg text-white font-semibold border-0 shadow-lg hover:shadow-xl transition-all duration-300 group h-11"
                style={{ background: CTA_GRADIENT_BG, boxShadow: CTA_GRADIENT_SHADOW }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      Submit application
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
              </Button>

              {/* Terms acknowledgement — implicit via submission */}
              <p className="text-center text-xs text-muted-foreground leading-relaxed">
                By submitting your application, you agree to the{' '}
                <a
                  href="https://lemonsqueezy.com/affiliate-terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-foreground transition-colors"
                  style={{ color: 'var(--tc-primary)' }}
                >
                  Lemon Squeezy affiliate terms
                </a>{' '}
                and confirm your promotion methods comply with them.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <div className="relative mx-auto max-w-2xl px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] text-foreground">
            Frequently asked
          </h2>
        </div>
        <div className="space-y-4">
          <FaqItem
            question="When do I get paid?"
            answer="Payouts are created on the 1st and 15th, then released on the 14th and 28th after a 30-day holding period. Available in hundreds of countries; minor processing and currency fees apply. We do not hold any funds — everything goes through Lemon Squeezy."
          />
          <FaqItem
            question="How do I track clicks and conversions?"
            answer={
              <>
                Everything lives in your Lemon Squeezy Affiliate Hub — clicks, referrals,
                earnings, payout history, and creatives. We don’t duplicate that dashboard
                inside AlphaStats.{' '}
                <a
                  href="https://docs.lemonsqueezy.com/help/affiliates/affiliate-hub"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                  style={{ color: 'var(--tc-primary)' }}
                >
                  Hub docs
                </a>
              </>
            }
          />
          <FaqItem
            question="What can't I do?"
            answer={
              <>
                No telemarketing, no impersonating AlphaStats or Lemon Squeezy, no unapproved
                product claims, no sub-affiliates without LS written approval. All campaigns
                must be pre-approved by LS and comply with applicable law. Read the{' '}
                <a
                  href="https://lemonsqueezy.com/affiliate-terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                  style={{ color: 'var(--tc-primary)' }}
                >
                  full affiliate terms
                </a>{' '}
                before you start promoting.
              </>
            }
          />
        </div>

        {/* Learn-more link — points at the LS "Becoming an Affiliate" docs so
            applicants can read the full program overview before applying. */}
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Want to learn more about how affiliate programs work on Lemon Squeezy?{' '}
          <a
            href="https://docs.lemonsqueezy.com/help/affiliates/becoming-an-affiliate"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground transition-colors"
            style={{ color: 'var(--tc-primary)' }}
          >
            Read the Lemon Squeezy guide
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </p>
      </div>
    </section>
  );
}

// ── Subcomponents ──────────────────────────────────────────────────────────

interface ProgramStatProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  detail: string;
}

// Card style mirrors CategoryCard in src/app/help/HelpCenterClient.tsx — same
// neutral border/hover tokens, bg-transparent, and color-mix tinted icon well.
function ProgramStat({ icon, value, label, detail }: ProgramStatProps) {
  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-black/[0.07] dark:border-white/[0.12] bg-transparent p-6 transition-colors duration-200 hover:border-black/[0.12] dark:hover:border-white/[0.18]">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{
          backgroundColor: 'color-mix(in oklab, var(--tc-primary) 12%, transparent)',
          color: 'var(--tc-primary)',
        }}
      >
        {icon}
      </div>
      <div className="text-3xl font-medium text-foreground tracking-[-0.03em] leading-none">
        {value}
      </div>
      <div className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
        {label}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

// FAQ items mirror FAQAccordionItem's container (non-interactive variant — we
// don't need the accordion toggle since there are only 3 items).
function FaqItem({
  question,
  answer,
}: {
  question: string;
  answer: React.ReactNode;
}) {
  return (
    <div className="group rounded-xl border border-black/[0.07] dark:border-white/[0.12] bg-transparent p-5 transition-colors duration-200 hover:border-black/[0.12] dark:hover:border-white/[0.18] sm:p-6">
      <h3 className="text-sm sm:text-base font-semibold leading-snug text-foreground/80 group-hover:text-foreground transition-colors mb-2">
        {question}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
        {answer}
      </p>
    </div>
  );
}

// ── Ambient type augmentation for window.gtag ──────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
