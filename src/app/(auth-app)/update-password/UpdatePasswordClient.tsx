'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { authContainerVariants, authItemVariants } from '@/components/auth/authAnimations';
import { useLoading } from '@/context/LoadingContext';
import { updatePasswordAction } from '@/lib/server/auth';
import { createClient } from '@/utils/supabase/client';
import { AuthShell } from '@/components/auth/AuthShell';
import { ErrorBanner } from '@/components/auth/ErrorBanner';
import { SuccessBanner } from '@/components/auth/SuccessBanner';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { GradientSubmitButton } from '@/components/auth/GradientSubmitButton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PASSWORD_RULES, getPasswordStrength } from '@/utils/passwordValidation';

export default function UpdatePasswordClient() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmTouched, setConfirmTouched] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();
  const { setIsLoading: setGlobalLoading } = useLoading();

  useEffect(() => {
    // The session is established by /api/auth/callback before we arrive here.
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true);
      } else {
        setError('expired');
      }
    });
  }, []);

  const strength = getPasswordStrength(password);
  const allRulesPassed = strength === PASSWORD_RULES.length;
  const passwordsMatch = password === confirmPassword;
  const canSubmit = sessionReady && !isLoading && allRulesPassed && passwordsMatch && confirmPassword.length > 0;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRulesPassed) {
      setError('Please meet all password requirements before submitting.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setGlobalLoading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.set('password', password);
      const result = await updatePasswordAction(null, formData);

      if (result.error) {
        setError(result.error ?? '');
      } else {
        setMessage('Password updated successfully. Redirecting to your strategies...');
        setTimeout(() => router.push('/stats'), 2000);
      }
    } finally {
      setIsLoading(false);
      setGlobalLoading(false);
    }
  };

  const clearErrorOnInput = () => {
    if (error !== 'expired') setError('');
  };

  return (
    <AuthShell
      title="Update your password"
      subtitle="Choose a new secure password to protect your account"
    >
      <motion.form
        variants={authContainerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
        onSubmit={handleUpdatePassword}
      >
        <div className="space-y-5">
          <motion.div variants={authItemVariants} className="space-y-2">
            <Label htmlFor="password" className="block text-sm font-semibold text-foreground">
              New password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              placeholder="Create a new password"
              onChange={(e) => {
                clearErrorOnInput();
                setPassword(e.target.value);
              }}
              className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
            />
            <PasswordStrengthMeter password={password} />
          </motion.div>

          <motion.div variants={authItemVariants} className="space-y-2">
            <Label htmlFor="confirmPassword" className="block text-sm font-semibold text-foreground">
              Confirm new password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              placeholder="Repeat your new password"
              onChange={(e) => {
                clearErrorOnInput();
                setConfirmPassword(e.target.value);
              }}
              onBlur={() => setConfirmTouched(true)}
              className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
            />
            {confirmTouched && confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-xs text-destructive font-medium">Passwords do not match.</p>
            )}
            {confirmTouched && confirmPassword.length > 0 && passwordsMatch && (
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Passwords match.</p>
            )}
          </motion.div>
        </div>

        {error === 'expired' ? (
          <ErrorBanner message="This reset link has expired or already been used.">
            <Link
              href="/reset-password"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-destructive underline underline-offset-2 hover:opacity-80 transition-opacity"
            >
              Request a new reset link
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </ErrorBanner>
        ) : error ? (
          <ErrorBanner message={error} />
        ) : null}

        {message && <SuccessBanner message={message} />}

        <motion.div
          variants={authItemVariants}
          className="flex items-center justify-between text-sm"
        >
          <Link
            href="/login"
            className="font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            Back to login
          </Link>
        </motion.div>

        <motion.div variants={authItemVariants}>
          <GradientSubmitButton
            loading={isLoading}
            disabled={!canSubmit}
            loadingLabel="Updating password..."
          >
            Update password
          </GradientSubmitButton>
        </motion.div>

        <motion.p
          variants={authItemVariants}
          className="mt-8 text-center text-xs text-muted-foreground"
        >
          Your new password will be used the next time you sign in
        </motion.p>
      </motion.form>
    </AuthShell>
  );
}
