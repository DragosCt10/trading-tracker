'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Palette } from 'lucide-react';
import { useLoading } from '@/context/LoadingContext';
import { useTheme } from '@/hooks/useTheme';
import { updatePasswordAction } from '@/lib/server/auth';
import { ThemePickerModal } from '@/components/shared/ThemePickerModal';

// shadcn/ui imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/shared/Logo';

export default function UpdatePasswordClient() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const router = useRouter();
  const { setIsLoading: setGlobalLoading } = useLoading();
  const { theme, toggleTheme, mounted } = useTheme();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setGlobalLoading(true);
    setError('');
    setMessage('');

    try {
      const formData = new FormData();
      formData.set('password', password);
      const result = await updatePasswordAction(null, formData);

      if (result.error) {
        setError(result.error);
      } else {
        setMessage('Password updated successfully. Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } finally {
      setIsLoading(false);
      setGlobalLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 transition-colors duration-500 bg-transparent">
      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] dark:opacity-0 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* Theme controls: color palette + dark/light toggle */}
      <div className="absolute top-6 right-4 z-50 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setThemePickerOpen(true)}
          className="p-3 rounded-xl bg-muted/50 border border-border backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 text-foreground"
          aria-label="Color theme"
        >
          <Palette className="w-5 h-5" style={{ color: 'var(--tc-primary)' }} />
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          className="p-3 rounded-xl bg-muted/50 border border-border backdrop-blur-md shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group text-foreground"
          aria-label="Toggle theme"
        >
          {!mounted ? (
            <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          ) : theme === 'dark' ? (
            <svg className="w-5 h-5 text-amber-400 group-hover:rotate-180 transition-transform duration-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
            </svg>
          )}
        </button>
      </div>
      <ThemePickerModal open={themePickerOpen} onClose={() => setThemePickerOpen(false)} />

      {/* Main content - Full page card */}
      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Top accent line — theme-aware */}
        <div className="absolute -top-20 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--tc-primary)] to-transparent opacity-50" />

        {/* Content container */}
        <div className="relative">
          {/* Header section */}
          <div className="flex flex-col items-center space-y-6 mb-10">
            {/* Logo with glow — theme-aware */}
            <div className="relative group">
              <div className="absolute -inset-3 rounded-2xl opacity-75 blur-xl group-hover:opacity-100 transition duration-500" style={{ background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))', opacity: 0.2 }} />
              <div className="relative grid h-20 w-20 place-content-center rounded-xl bg-muted/50 border border-border backdrop-blur-sm shadow-2xl">
                <Logo width={48} height={48} />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-4xl font-bold text-foreground animate-in fade-in slide-in-from-top-2 duration-700 delay-150">
                Update your password
              </h1>
              <p className="text-sm text-muted-foreground font-medium animate-in fade-in slide-in-from-top-2 duration-700 delay-300">
                Choose a new secure password to protect your account
              </p>
            </div>
          </div>

          {/* Form section */}
          <form className="space-y-6" onSubmit={handleUpdatePassword}>
            <div className="space-y-5">
              {/* Password input */}
              <div className="space-y-2 animate-in fade-in slide-in-from-left-2 duration-700 delay-500">
                <Label htmlFor="password" className="block text-sm font-semibold text-foreground">
                  New password
                </Label>
                <div className="relative group">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    placeholder="Create a new password"
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-300"
                  />
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-lg bg-destructive/10 backdrop-blur-sm p-4 border border-destructive/20 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-destructive" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-destructive">{error}</span>
                </div>
              </div>
            )}

            {/* Success message — theme-aware */}
            {message && (
              <div className="rounded-lg backdrop-blur-sm p-4 border animate-in fade-in slide-in-from-top-2 duration-300 bg-[var(--tc-primary)]/10 border-[var(--tc-primary)]/20">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-[var(--tc-primary)]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-[var(--tc-primary)]">{message}</span>
                </div>
              </div>
            )}

            {/* Links */}
            <div className="flex items-center justify-between text-sm animate-in fade-in duration-700 delay-1000">
              <Link href="/login" className="font-medium text-muted-foreground hover:text-foreground transition-colors duration-200">
                Back to login
              </Link>
            </div>

            {/* Submit button — theme gradient */}
            <div className="animate-in fade-in duration-700 delay-1100">
              <Button
                size="lg"
                type="submit"
                disabled={isLoading}
                className="relative w-full h-12 overflow-hidden font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 group border-0 disabled:opacity-60 cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))`,
                  boxShadow: '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating password...
                    </>
                  ) : (
                    <>
                      Update password
                      <svg
                        className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </span>
                {!isLoading && (
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
                )}
              </Button>
            </div>
          </form>

          {/* Footer text */}
          <p className="mt-8 text-center text-xs text-muted-foreground animate-in fade-in duration-700 delay-1200">
            Your new password will be used the next time you sign in
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-from-bottom-4 {
          from { transform: translateY(1rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-in-from-top-2 {
          from { transform: translateY(-0.5rem); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-in-from-left-2 {
          from { transform: translateX(-0.5rem); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-in {
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
}
