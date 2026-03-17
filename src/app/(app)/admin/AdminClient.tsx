'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, UserCheck, UserX, Shield, Loader2, AlertCircle } from 'lucide-react';
import {
  findUserByEmail,
  adminGrantSubscription,
  adminRevokeSubscription,
  grantAdminRole,
  revokeAdminRole,
} from '@/lib/server/admin';
import { resolveSubscription } from '@/lib/server/subscription';
import type { ResolvedSubscription } from '@/types/subscription';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface AdminUser {
  id: string;
  email: string;
  subscription?: ResolvedSubscription;
}

interface AdminClientProps {
  currentUserId: string;
  admins: { userId: string; email: string; grantedAt: string }[];
}

export default function AdminClient({ currentUserId, admins: initialAdmins }: AdminClientProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'users' | 'team'>('users');

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
      const sub = await resolveSubscription(user.id);
      setFoundUser({ ...user, subscription: sub });
    });
  }

  function handleGrantPro() {
    if (!foundUser) return;
    startMutateTransition(async () => {
      await adminGrantSubscription(foundUser.id, 'pro');
      const sub = await resolveSubscription(foundUser.id);
      setFoundUser((u) => u ? { ...u, subscription: sub } : null);
    });
  }

  function handleRevoke() {
    if (!foundUser) return;
    startMutateTransition(async () => {
      await adminRevokeSubscription(foundUser.id);
      const sub = await resolveSubscription(foundUser.id);
      setFoundUser((u) => u ? { ...u, subscription: sub } : null);
    });
  }

  function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    setTeamError(null);
    startTeamTransition(async () => {
      const user = await findUserByEmail(newAdminEmail.trim().toLowerCase());
      if (!user) {
        setTeamError('No user found with that email.');
        return;
      }
      await grantAdminRole(user.id);
      setAdmins((prev) => [...prev, { userId: user.id, email: user.email, grantedAt: new Date().toISOString() }]);
      setNewAdminEmail('');
      router.refresh();
    });
  }

  function handleRemoveAdmin(userId: string) {
    startTeamTransition(async () => {
      await revokeAdminRole(userId);
      setAdmins((prev) => prev.filter((a) => a.userId !== userId));
    });
  }

  const tier = foundUser?.subscription?.tier ?? 'starter';
  const isPro = tier === 'pro' || tier === 'elite';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-0">
      <div className="flex items-center gap-2 mb-1">
        <Shield className="h-5 w-5 text-amber-400" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Admin</h1>
      </div>
      <p className="text-sm text-zinc-500 mb-8">Manage user subscriptions and super admin team.</p>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 p-1 mb-8">
        {(['users', 'team'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex-1 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors capitalize',
              tab === t
                ? 'bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            )}
          >
            {t === 'users' ? 'User Subscriptions' : 'Admin Team'}
          </button>
        ))}
      </div>

      {/* User search tab */}
      {tab === 'users' && (
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={isSearching || !email}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </form>

          {searchError && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" /> {searchError}
            </div>
          )}

          {foundUser && (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
              <div>
                <p className="font-medium text-slate-900 dark:text-slate-50">{foundUser.email}</p>
                <p className="text-sm text-zinc-500 mt-0.5">
                  ID: <span className="font-mono text-xs">{foundUser.id}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Current tier:</span>
                <span className={cn(
                  'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                  isPro ? 'text-amber-400 border-amber-500/50' : 'text-zinc-400 border-zinc-700'
                )}>
                  {tier}
                </span>
                <span className="text-xs text-zinc-400">({foundUser.subscription?.status})</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleGrantPro}
                  disabled={isMutating || isPro}
                  className="bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {isMutating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UserCheck className="mr-1 h-3.5 w-3.5" />}
                  Grant PRO
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRevoke}
                  disabled={isMutating || !isPro}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {isMutating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <UserX className="mr-1 h-3.5 w-3.5" />}
                  Revoke
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team tab */}
      {tab === 'team' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
            {admins.length === 0 && (
              <p className="px-4 py-4 text-sm text-zinc-500">No admins found.</p>
            )}
            {admins.map((admin) => (
              <div key={admin.userId} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{admin.email}</p>
                  <p className="text-xs text-zinc-400 font-mono">{admin.userId}</p>
                </div>
                {admin.userId !== currentUserId && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveAdmin(admin.userId)}
                    disabled={isTeamMutating}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddAdmin} className="flex gap-2">
            <Input
              type="email"
              placeholder="Add admin by email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={isTeamMutating || !newAdminEmail}>
              {isTeamMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Add Admin
            </Button>
          </form>

          {teamError && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" /> {teamError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
