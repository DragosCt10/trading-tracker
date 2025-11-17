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
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setIsLoading } = useLoading();
  const { data: userData } = useUserDetails();

  useEffect(() => {
    // If user is already logged in, redirect to dashboard
    if (userData?.user && userData?.session) {
      router.push('/dashboard');
    }
  }, [userData, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      router.refresh();
      router.push('/trades/new');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-center text-slate-800">
          Create your account
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSignup}>
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-slate-500 mb-1">
              Email address
            </Label>
            <Input
              id="email"
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
          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-slate-500 mb-1">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              placeholder="Password"
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 shadow-none"
            />
          </div>

          {error && (
            <div className={cn('rounded-md mt-2 bg-red-50 p-3 border border-red-300')}>
              <div className="text-sm text-red-500 text-center">{error}</div>
            </div>
          )}

          <Button size="lg" type="submit" className="w-full">
            Sign up
          </Button>

          <div className="flex items-center justify-center">
            <div className="text-sm">
              <Link
                href="/login"
                className={cn(
                  'font-medium text-slate-700 hover:text-slate-900 transition-colors'
                )}
              >
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}