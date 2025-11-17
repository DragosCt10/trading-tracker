'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';
import { useUserDetails } from '@/hooks/useUserDetails';

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
import { Label } from '@/components/ui/label'; // <-- Added Label from shadcn/ui
// Remove Form, FormField, etc. since we are not using them anymore
import { cn } from '@/lib/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const { data: userData } = useUserDetails();

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (userData?.user && userData?.session) {
      router.push('/analytics');
    }
  }, [userData, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        router.push('/analytics');
        router.refresh();
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
        <div className="grid h-10 w-10 place-content-center rounded-xl bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 border border-slate-300 mb-4">
          {/* Candlestick chart icon for trading (custom SVG) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            className="h-6 w-6"
          >
            <rect x="5" y="6" width="3" height="12" rx="1" className="fill-slate-500" />
            <rect x="12.5" y="3" width="3" height="18" rx="1" className="fill-slate-600" />
            <rect x="20" y="10" width="3" height="8" rx="1" className="fill-slate-400" />
            {/* Top wicks */}
            <rect x="6.25" y="4" width="0.5" height="2" rx="0.25" className="fill-slate-400" />
            <rect x="13.75" y="1" width="0.5" height="2" rx="0.25" className="fill-slate-400" />
            <rect x="21.25" y="8" width="0.5" height="2" rx="0.25" className="fill-slate-300" />
            {/* Bottom wicks */}
            <rect x="6.25" y="18" width="0.5" height="2" rx="0.25" className="fill-slate-400" />
            <rect x="13.75" y="21" width="0.5" height="2" rx="0.25" className="fill-slate-400" />
            <rect x="21.25" y="18" width="0.5" height="2" rx="0.25" className="fill-slate-300" />
          </svg>
        </div>
        <CardTitle className="text-2xl font-semibold text-center text-slate-800">
          Sign in 
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email-address" className="block text-sm font-medium text-slate-500">
                Email address
              </Label>
              <Input
                id="email-address"
                type="email"
                required
                value={email}
                autoComplete="email"
                placeholder="Enter your email"
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 shadow-none"
              />
            </div>
            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-slate-500">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                placeholder="Enter your password"
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 shadow-none"
              />
            </div>
          </div>
          {error && (
            <div className={cn('rounded-md mt-2 bg-red-50 p-3 border border-red-300')}>
              <div className="text-sm text-red-500">{error}</div>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <Link
              href="/reset-password"
              className={cn(
                'font-medium text-slate-700 hover:text-slate-900 transition-colors'
              )}
            >
              Forgot your password?
            </Link>
            <Link
              href="/signup"
              className={cn(
                'font-medium text-slate-700 hover:text-slate-900 transition-colors'
              )}
            >
              Create an account
            </Link>
          </div>
          <Button size="lg" type="submit" className="w-full">
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
