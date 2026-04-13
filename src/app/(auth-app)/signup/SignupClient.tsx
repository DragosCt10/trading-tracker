'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { authContainerVariants, authItemVariants } from '@/components/auth/authAnimations';
import { useLoading } from '@/context/LoadingContext';
import { useUserDetails } from '@/hooks/useUserDetails';
import { signupAction } from '@/lib/server/auth';
import GoogleButton from '@/components/auth/GoogleButton';
import { AuthShell } from '@/components/auth/AuthShell';
import { ErrorBanner } from '@/components/auth/ErrorBanner';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { GradientSubmitButton } from '@/components/auth/GradientSubmitButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isPasswordStrong } from '@/utils/passwordValidation';

export default function SignupClient() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const { data: userData } = useUserDetails();
  const allRulesPassed = isPasswordStrong(password);

  useEffect(() => {
    if (userData?.user && userData?.session) {
      router.push('/stats');
    }
  }, [userData, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.set('email', email);
      formData.set('password', password);
      formData.set('redirectTo', `${window.location.origin}/api/auth/callback?next=/stats`);
      const result = await signupAction(null, formData);

      if (result.error) {
        setError(result.error ?? '');
        setIsSubmitting(false);
      } else if (result.requiresEmailConfirmation) {
        setEmailSent(true);
      } else {
        window.location.href = '/stats';
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <AuthShell
        title="Check your email"
        subtitle={
          <span>
            We sent a confirmation link to{' '}
            <span className="font-semibold text-foreground">{email}</span>. Click it to activate your
            account.
          </span>
        }
      >
        <div role="status" aria-live="polite" className="flex flex-col items-center gap-6">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--tc-primary)] hover:text-[var(--tc-text)] transition-colors duration-200"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking your trades and improve your performance"
    >
      <div className="mb-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-400">
        <GoogleButton />
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border/60" />
          <span className="text-xs text-muted-foreground font-medium">or continue with email</span>
          <div className="flex-1 h-px bg-border/60" />
        </div>
      </div>

      <motion.form
        variants={authContainerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
        onSubmit={handleSignup}
      >
        <div className="space-y-5">
          <motion.div variants={authItemVariants} className="space-y-2">
            <Label htmlFor="email" className="block text-sm font-semibold text-foreground">
              Email address
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              placeholder="trader@example.com"
              onChange={(e) => {
                setError(null);
                setEmail(e.target.value);
              }}
              className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
            />
          </motion.div>

          <motion.div variants={authItemVariants} className="space-y-2">
            <Label htmlFor="password" className="block text-sm font-semibold text-foreground">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              placeholder="Create a strong password"
              onChange={(e) => {
                setError(null);
                setPassword(e.target.value);
              }}
              className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
            />
            <PasswordStrengthMeter password={password} />
          </motion.div>
        </div>

        {error && <ErrorBanner message={error} />}

        <motion.div
          variants={authItemVariants}
          className="flex items-center justify-between text-sm"
        >
          <Link
            href="/login"
            className="font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Already have an account? Sign in
          </Link>
          <Link
            href="/reset-password"
            className="font-medium text-[var(--tc-primary)] hover:text-[var(--tc-text)] transition-colors duration-200 flex items-center gap-1"
          >
            Forgot password?
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </motion.div>

        <motion.div variants={authItemVariants}>
          <GradientSubmitButton
            loading={isSubmitting}
            disabled={isSubmitting || !allRulesPassed}
            loadingLabel="Creating account..."
          >
            Create account
          </GradientSubmitButton>
        </motion.div>

        <motion.p
          variants={authItemVariants}
          className="mt-8 text-center text-xs text-muted-foreground"
        >
          Join AlphaStats and build a disciplined trading routine
        </motion.p>
      </motion.form>
    </AuthShell>
  );
}
