'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { useLoading } from '@/context/LoadingContext';

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
    <div className="flex items-center justify-center bg-stone-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-stone-900">
            Reset your password
          </h2>
          <p className="mt-2 text-center text-sm text-stone-600">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleResetPassword}>
          <div>
            <label htmlFor="email-address" className="block text-sm font-medium text-stone-700 mb-1">
              Email address
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-stone-300 placeholder-stone-400 text-stone-900 focus:outline-none hover:border-stone-300 hover:ring-none focus:border-stone-400 focus:ring-none sm:text-sm"
              placeholder="Enter your email"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-4">
              <div className="text-sm text-red-500">{error}</div>
            </div>
          )}

          {message && (
            <div className="rounded-lg bg-green-50 p-4">
              <div className="text-sm text-green-500">{message}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              className="inline-flex items-center justify-center border align-middle select-none font-sans font-medium text-center duration-300 ease-in disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed focus:shadow-none text-base w-full py-2.5 px-5 shadow-sm hover:shadow-md relative bg-linear-to-b from-stone-700 to-stone-800 border-stone-900 text-stone-50 rounded-lg hover:bg-linear-to-b hover:from-stone-800 hover:to-stone-800 hover:border-stone-900 after:absolute after:inset-0 after:rounded-[inherit] after:box-shadow after:shadow-[inset_0_1px_0px_rgba(255,255,255,0.25),inset_0_-2px_0px_rgba(0,0,0,0.35)] after:pointer-events-none transition antialiased"
            >
              Send reset link
            </button>
          </div>

          <div className="flex items-center justify-center">
            <div className="text-sm">
              <Link
                href="/login"
                className="font-medium text-stone-700 hover:text-stone-900 transition-colors duration-200"
              >
                Back to login
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}