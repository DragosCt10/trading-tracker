'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useLoading } from '@/context/LoadingContext';
import { resetPasswordAction } from '@/lib/server/auth';
import { AuthShell } from '@/components/auth/AuthShell';
import { ErrorBanner } from '@/components/auth/ErrorBanner';
import { SuccessBanner } from '@/components/auth/SuccessBanner';
import { GradientSubmitButton } from '@/components/auth/GradientSubmitButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPasswordClient() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { setIsLoading } = useLoading();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.set('email', email);
      formData.set('redirectTo', `${window.location.origin}/api/auth/callback?next=/update-password`);
      const result = await resetPasswordAction(null, formData);

      if (result.error) {
        setError(result.error ?? '');
      } else {
        setMessage('Check your email for the password reset link');
        setEmail('');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a secure reset link"
    >
      <form className="space-y-6" onSubmit={handleResetPassword}>
        <div className="space-y-5">
          <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-700 delay-500">
            <Label htmlFor="email-address" className="block text-sm font-semibold text-foreground">
              Email address
            </Label>
            <div className="relative group">
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                placeholder="trader@example.com"
                onChange={(e) => {
                  setError('');
                  setMessage('');
                  setEmail(e.target.value);
                }}
                className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {error && <ErrorBanner message={error} />}
        {message && <SuccessBanner message={message} />}

        <div className="flex items-center justify-between text-sm animate-in fade-in duration-700 delay-1000">
          <Link
            href="/login"
            className="font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Back to login
          </Link>
          <Link
            href="/signup"
            className="font-medium text-[var(--tc-primary)] hover:text-[var(--tc-text)] transition-colors duration-200 flex items-center gap-1"
          >
            Create account
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="w-full animate-in fade-in duration-700 delay-1100">
          <GradientSubmitButton loading={isSubmitting} loadingLabel="Sending reset link...">
            Send reset link
          </GradientSubmitButton>
        </div>
      </form>

      <p className="mt-8 text-center text-xs text-muted-foreground animate-in fade-in duration-700 delay-1200">
        Securely reset your password and get back to tracking your trades
      </p>
    </AuthShell>
  );
}
