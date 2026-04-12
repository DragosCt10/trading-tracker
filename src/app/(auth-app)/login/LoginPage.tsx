'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, LockKeyhole, Loader2 } from 'lucide-react';
import { useLoading } from '@/context/LoadingContext';
import { useUserDetails } from '@/hooks/useUserDetails';
import { loginAction } from '@/lib/server/auth';
import GoogleButton from '@/components/auth/GoogleButton';
import { AuthShell } from '@/components/auth/AuthShell';
import { ErrorBanner } from '@/components/auth/ErrorBanner';
import { GradientSubmitButton } from '@/components/auth/GradientSubmitButton';
import { createClient } from '@/utils/supabase/client';
import { safeRedirectPath } from '@/utils/safeRedirectPath';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [magicLinkStatus, setMagicLinkStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [magicLinkError, setMagicLinkError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setIsLoading } = useLoading();
  const { data: userData } = useUserDetails();

  const oauthError = searchParams.get('error');
  const redirectTo = safeRedirectPath(searchParams.get('redirectTo'));
  const sessionReason = searchParams.get('reason');
  const checkoutSuccess = searchParams.get('checkout') === 'success';

  const didRedirect = useRef(false);

  useEffect(() => {
    // Skip auto-redirect when the session was explicitly ended (revoked from another device).
    if (sessionReason) return;
    if (didRedirect.current) return;
    if (userData?.user && userData?.session) {
      didRedirect.current = true;
      const to = safeRedirectPath(searchParams.get('redirectTo'));
      router.push(to ?? '/stats');
    }
  }, [userData, router, searchParams, sessionReason]);

  // Magic-link: parse access_token/refresh_token from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) return;

    let cancelled = false;
    setMagicLinkStatus('loading');
    const supabase = createClient();
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(async ({ error }) => {
      // Clear tokens from URL hash unconditionally before anything else —
      // they must not linger in browser history or be readable by scripts.
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      if (cancelled) return;
      if (error) {
        setMagicLinkStatus('error');
        setMagicLinkError(error.message);
        return;
      }
      // Fire-and-forget enforce-single-session with a 3s timeout so a slow
      // server never blocks the redirect to /stats.
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        await fetch('/api/auth/enforce-single-session', { method: 'POST', signal: controller.signal });
        clearTimeout(timeout);
      } catch (err) {
        console.warn('[enforce-single-session]', err);
      }
      if (!cancelled) {
        window.location.href = '/stats';
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.set('email', email);
      formData.set('password', password);
      const result = await loginAction(null, formData);

      if (result.error) {
        setError(result.error ?? '');
        setIsSubmitting(false);
      } else {
        const to = safeRedirectPath(searchParams.get('redirectTo'));
        window.location.href = to ?? '/stats';
        return;
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setIsSubmitting(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title="Welcome Back" subtitle="Unlock your trading analytics & insights">
      {/* Checkout success banner (anonymous purchase via Lemon Squeezy) */}
      {checkoutSuccess && magicLinkStatus === 'idle' && (
        <div
          role="status"
          aria-live="polite"
          className="mb-8 rounded-2xl border border-[var(--tc-primary)]/20 bg-[var(--tc-primary)]/5 backdrop-blur-sm p-5 text-center animate-in fade-in duration-500"
        >
          <div className="flex justify-center mb-3">
            <div className="grid h-9 w-9 place-content-center rounded-xl border border-[var(--tc-primary)]/20 bg-[var(--tc-primary)]/10">
              <CheckCircle2 className="h-4 w-4 text-[var(--tc-primary)]" aria-hidden="true" />
            </div>
          </div>
          <p className="text-sm font-semibold text-foreground">Payment received!</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Check your email for a magic link to sign in and activate your Pro plan.
          </p>
        </div>
      )}

      {/* Session-ended banner (redirected from another page after revocation) */}
      {sessionReason === 'session_replaced' && magicLinkStatus === 'idle' && (
        <div
          role="status"
          aria-live="polite"
          className="mb-8 rounded-2xl border border-border bg-muted/50 backdrop-blur-sm p-5 text-center animate-in fade-in duration-500"
        >
          <div className="flex justify-center mb-3">
            <div className="grid h-9 w-9 place-content-center rounded-xl border border-border bg-background/60">
              <LockKeyhole className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
          </div>
          <p className="text-sm font-semibold text-foreground">Session ended</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Your session has ended. Please sign in again.
          </p>
        </div>
      )}

      {/* Magic link processing state */}
      {magicLinkStatus === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="mb-8 rounded-2xl border border-[var(--tc-primary)]/20 bg-[var(--tc-primary)]/5 p-6 text-center animate-in fade-in duration-500"
        >
          <div className="flex justify-center mb-3">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--tc-primary)]" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-foreground">Signing you in&hellip;</p>
          <p className="mt-1 text-xs text-muted-foreground">
            You&apos;ll be redirected to your dashboard in a moment.
          </p>
        </div>
      )}

      {magicLinkStatus === 'error' && (
        <div className="mb-8">
          <ErrorBanner message={magicLinkError || 'The magic link may have expired. Please try again.'} />
        </div>
      )}

      {/* Google OAuth */}
      {magicLinkStatus === 'idle' && (
        <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
          <GoogleButton redirectTo={redirectTo} />
          {oauthError && (
            <div className="-mt-2">
              <ErrorBanner message={`Google sign-in error: ${oauthError}`} />
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-xs text-muted-foreground font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
        </div>
      )}

      {/* Form section */}
      {magicLinkStatus === 'idle' && (
        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-5">
            <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-700 delay-500">
              <Label htmlFor="email-address" className="block text-sm font-semibold text-foreground">
                Email address
              </Label>
              <Input
                id="email-address"
                type="email"
                required
                value={email}
                autoComplete="email"
                placeholder="trader@example.com"
                onChange={(e) => {
                  setError('');
                  setEmail(e.target.value);
                }}
                className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
              />
            </div>

            <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-700 delay-700">
              <Label htmlFor="password" className="block text-sm font-semibold text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                placeholder="••••••••"
                onChange={(e) => {
                  setError('');
                  setPassword(e.target.value);
                }}
                className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
              />
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          <div className="flex items-center justify-between text-sm animate-in fade-in duration-700 delay-1000">
            <Link
              href="/reset-password"
              className="font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Forgot password?
            </Link>
            <Link
              href="/signup"
              className="font-medium text-[var(--tc-primary)] hover:text-[var(--tc-text)] transition-colors duration-200 flex items-center gap-1"
            >
              Create account
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="animate-in fade-in duration-700 delay-1100">
            <GradientSubmitButton loading={isSubmitting} loadingLabel="Signing in...">
              Sign in to Dashboard
            </GradientSubmitButton>
          </div>
        </form>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground animate-in fade-in duration-700 delay-1200">
        Track your trades, analyze your performance, and optimize your strategy
      </p>
    </AuthShell>
  );
}
