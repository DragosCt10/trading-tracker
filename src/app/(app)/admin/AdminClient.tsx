'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserCheck, UserX, Shield, Loader2, AlertCircle, Flag, Star, BarChart3 } from 'lucide-react';
import ModerationPanel from '@/components/admin/ModerationPanel';
import ReviewsPanel from '@/components/admin/ReviewsPanel';
import PlatformStatsPanel from '@/components/admin/PlatformStatsPanel';
import {
  findUserByEmail,
  adminGrantSubscription,
  adminRevokeSubscription,
  adminResolveSubscription,
  grantAdminRole,
  revokeAdminRole,
} from '@/lib/server/admin';
import type { ResolvedSubscription } from '@/types/subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminUser {
  id: string; 
  email: string;
  subscription?: ResolvedSubscription;
}

interface AdminClientProps {
  currentUserId: string;
  admins: { userId: string; email: string; role: 'admin' | 'super_admin'; grantedAt: string }[];
  isSuperAdmin: boolean;
}

export default function AdminClient({ currentUserId, admins: initialAdmins, isSuperAdmin }: AdminClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'users' | 'team' | 'moderation' | 'reviews' | 'platform_stats'>('users');

  // User search state
  const [email, setEmail] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<AdminUser | null>(null);
  const [isSearching, startSearchTransition] = useTransition();
  const [isMutating, startMutateTransition] = useTransition();

  // Team state
  const [admins, setAdmins] = useState(initialAdmins);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [teamError, setTeamError] = useState<string | null>(null);
  const [isTeamMutating, startTeamTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchError(null);
    setFoundUser(null);

    startSearchTransition(async () => {
      const user = await findUserByEmail(email.trim().toLowerCase());
      if (!user) {
        setSearchError('No user found with that email.');
        return;
      }
      const sub = await adminResolveSubscription(user.id);
      setFoundUser({ ...user, subscription: sub });
    });
  }

  function handleGrantPro() {
    if (!foundUser) return;
    startMutateTransition(async () => {
      try {
        await adminGrantSubscription(foundUser.id, 'pro');
        const sub = await adminResolveSubscription(foundUser.id);
        setFoundUser((u) => u ? { ...u, subscription: sub } : null);
      } catch {
        setSearchError('Failed to grant PRO subscription. Please try again.');
      }
    });
  }

  function handleRevoke() {
    if (!foundUser) return;
    startMutateTransition(async () => {
      try {
        await adminRevokeSubscription(foundUser.id);
        const sub = await adminResolveSubscription(foundUser.id);
        setFoundUser((u) => u ? { ...u, subscription: sub } : null);
      } catch {
        setSearchError('Failed to revoke subscription. Please try again.');
      }
    });
  }

  function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    setTeamError(null);
    startTeamTransition(async () => {
      try {
        const user = await findUserByEmail(newAdminEmail.trim().toLowerCase());
        if (!user) {
          setTeamError('No user found with that email.');
          return;
        }
        await grantAdminRole(user.id);
        setAdmins((prev) => [...prev, { userId: user.id, email: user.email, role: 'admin' as const, grantedAt: new Date().toISOString() }]);
        setNewAdminEmail('');
        router.refresh();
      } catch {
        setTeamError('Failed to grant admin role. Please try again.');
      }
    });
  }

  function handleRemoveAdmin(userId: string) {
    startTeamTransition(async () => {
      try {
        await revokeAdminRole(userId);
        setAdmins((prev) => prev.filter((a) => a.userId !== userId));
      } catch {
        setTeamError('Failed to revoke admin role. Please try again.');
      }
    });
  }

  const tier = foundUser?.subscription?.tier ?? 'starter';
  const isPro = tier === 'pro' || tier === 'elite';

  const themedGradientStyle = {
    background: 'linear-gradient(to right, var(--tc-primary), var(--tc-accent), var(--tc-accent-end))',
    boxShadow:
      '0 10px 15px -3px color-mix(in oklab, var(--tc-primary) 30%, transparent), 0 4px 6px -4px color-mix(in oklab, var(--tc-primary) 20%, transparent)',
  } as const;

  const signOutButtonClass =
    'relative h-9 px-4 overflow-hidden rounded-xl bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 hover:from-rose-600 hover:via-red-600 hover:to-orange-600 text-white font-semibold shadow-md shadow-rose-500/30 dark:shadow-rose-500/20 group border-0 disabled:opacity-60';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-0">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/70 dark:bg-slate-800/30 shadow-sm">
              <Shield className="h-4.5 w-4.5 text-amber-500 dark:text-amber-400" />
            </span>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
              Admin
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Manage user subscriptions and super admin team.
          </p>
        </div>
      </div>

      {/* Tabs */}
      {isSuperAdmin && (
        <div className="flex gap-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/60 dark:bg-slate-900/20 p-1 mb-8 backdrop-blur-sm overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {(['users', 'team', 'moderation', 'reviews', 'platform_stats'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-shrink-0 sm:flex-1 whitespace-nowrap rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold transition-colors capitalize !shadow-none cursor-pointer flex items-center justify-center gap-1.5',
                tab === t
                  ? 'text-slate-900 dark:text-slate-50 shadow-sm border border-slate-200/70 dark:border-slate-700/50 bg-white dark:bg-slate-800/30'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              {t === 'moderation' && <Flag className="h-3.5 w-3.5" />}
              {t === 'reviews' && <Star className="h-3.5 w-3.5" />}
              {t === 'platform_stats' && <BarChart3 className="h-3.5 w-3.5" />}
              {t === 'users' ? 'Subscriptions' : t === 'team' ? 'Admin Team' : t === 'moderation' ? 'Moderation' : t === 'reviews' ? 'Reviews' : 'Platform Stats'}
            </button>
          ))}
        </div>
      )}

      {/* User search tab */}
      {tab === 'users' && (
        <div className="space-y-6">
          <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                Find a user
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                Search by email, then grant or revoke PRO.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              id="user-search-email"
              name="user-search-email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
            />
            <Button
              type="submit"
              disabled={isSearching || !email}
              className="relative h-12 px-5 overflow-hidden rounded-2xl border-0 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-60"
              style={themedGradientStyle}
            >
              <span className="relative z-10 flex items-center gap-2">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Search
              </span>
              {!isSearching && email && (
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
              )}
            </Button>
          </form>
            </CardContent>
          </Card>

          {searchError && (
            <div className="rounded-2xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{searchError}</span>
            </div>
          )}

          {foundUser && (
            <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  {foundUser.email}
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                  ID: <span className="font-mono text-xs">{foundUser.id}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Current tier:</span>
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                      isPro
                        ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15 border-amber-200 dark:border-amber-800'
                        : 'text-slate-500 dark:text-slate-300 bg-slate-500/5 dark:bg-slate-50/5 border-slate-200/70 dark:border-slate-700/50'
                    )}
                  >
                    {tier}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    ({foundUser.subscription?.status})
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleGrantPro}
                  disabled={isMutating || isPro}
                  className="relative overflow-hidden rounded-xl border-0 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-60"
                  style={themedGradientStyle}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isMutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}
                    Grant PRO
                  </span>
                  {!isMutating && !isPro && (
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRevoke}
                  disabled={isMutating || !isPro}
                  className={cn(signOutButtonClass, 'gap-2')}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isMutating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserX className="h-3.5 w-3.5" />}
                    Revoke
                  </span>
                </Button>
              </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Team tab */}
      {tab === 'team' && (
        <div className="space-y-6">
          <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                Admin team
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                Manage who has admin access.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-900/30 divide-y divide-slate-100 dark:divide-slate-800/60 overflow-hidden">
                {admins.length === 0 && (
                  <p className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400">No admins found.</p>
                )}
                {admins.map((admin) => (
                  <div key={admin.userId} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 flex items-center gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50 truncate">{admin.email}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">{admin.userId}</p>
                      </div>
                      <span className={cn(
                        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shrink-0',
                        admin.role === 'super_admin'
                          ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-200 dark:border-amber-800'
                          : 'text-slate-500 dark:text-slate-400 bg-slate-500/5 border-slate-200/70 dark:border-slate-700/50'
                      )}>
                        {admin.role === 'super_admin' ? 'super admin' : 'admin'}
                      </span>
                    </div>
                    {admin.userId !== currentUserId && admin.role !== 'super_admin' && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveAdmin(admin.userId)}
                        disabled={isTeamMutating}
                        className={signOutButtonClass}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Add admin
              </CardTitle>
              <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
                Grant admin role to a user by email.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleAddAdmin} className="flex gap-2">
                <Input
                  id="admin-email"
                  name="admin-email"
                  type="email"
                  placeholder="Add admin by email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  required
                  className="h-12 rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300"
                />
                <Button
                  type="submit"
                  disabled={isTeamMutating || !newAdminEmail}
                  className="relative h-12 px-5 overflow-hidden rounded-2xl border-0 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 group disabled:opacity-60"
                  style={themedGradientStyle}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {isTeamMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Add Admin
                  </span>
                  {!isTeamMutating && newAdminEmail && (
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700" />
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {teamError && (
            <div className="rounded-2xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{teamError}</span>
            </div>
          )}
        </div>
      )}

      {/* Moderation tab */}
      {tab === 'moderation' && <ModerationPanel />}

      {/* Reviews tab */}
      {tab === 'reviews' && <ReviewsPanel />}

      {/* Platform Stats tab */}
      {tab === 'platform_stats' && <PlatformStatsPanel />}
    </div>
  );
}
