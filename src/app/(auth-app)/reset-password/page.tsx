'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';

// shadcn/ui imports
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { setIsLoading } = useLoading();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for the password reset link');
        setEmail('');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-none">
      <CardHeader className="flex flex-col items-center">
        <img
          src="/trading-tracker-logo.png"
          alt="Trading Tracker Logo"
          className="h-16 w-auto mb-4"
        />
        <CardTitle className="text-2xl font-semibold text-center text-slate-800">
          Reset your password
        </CardTitle>
        <p className="mt-2 text-center text-sm text-slate-600 font-normal">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleResetPassword}>
          <div>
            <Label htmlFor="email-address" className="block text-sm font-medium text-slate-500 mb-1">
              Email address
            </Label>
            <Input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              placeholder="Enter your email"
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 shadow-none"
            />
          </div>

          {error && (
            <div className={cn('rounded-md mt-2 bg-red-50 p-3 border border-red-300')}>
              <div className="text-sm text-red-500">{error}</div>
            </div>
          )}
          {message && (
            <div className={cn('rounded-md mt-2 bg-green-50 p-3 border border-green-300')}>
              <div className="text-sm text-green-600">{message}</div>
            </div>
          )}

          <Button size="lg" type="submit" className="w-full">
            Send reset link
          </Button>
          <div className="flex items-center justify-center">
            <div className="text-sm">
              <Link
                href="/login"
                className={cn(
                  'font-medium text-slate-700 hover:text-slate-900 transition-colors'
                )}
              >
                Back to login
              </Link>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}