'use client';

import { useState, useTransition } from 'react';
import { Flag, EyeOff, Eye, Ban, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  getPendingReports,
  resolveReport,
  setPostVisibility,
  setUserBan,
  getHiddenPosts,
  getBannedUsers,
} from '@/lib/server/feedModeration';
import type { FeedReport } from '@/lib/server/feedModeration';
import type { FeedPost, SocialProfile } from '@/types/social';

type Section = 'reports' | 'hidden' | 'banned';

export default function ModerationPanel() {
  const [section, setSection] = useState<Section>('reports');
  const [reports, setReports]         = useState<FeedReport[] | null>(null);
  const [hiddenPosts, setHiddenPosts] = useState<FeedPost[] | null>(null);
  const [bannedUsers, setBannedUsers] = useState<SocialProfile[] | null>(null);
  const [isLoading, startLoad]   = useTransition();
  const [isMutating, startMutate] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function loadSection(s: Section) {
    setSection(s);
    setMsg(null);
    startLoad(async () => {
      if (s === 'reports')  { const r = await getPendingReports(); setReports(r.items); }
      if (s === 'hidden')   { const r = await getHiddenPosts(); setHiddenPosts(r.items); }
      if (s === 'banned')   { const r = await getBannedUsers(); setBannedUsers(r); }
    });
  }

  function handleResolve(reportId: string, action: Parameters<typeof resolveReport>[1]) {
    startMutate(async () => {
      const result = await resolveReport(reportId, action);
      if ('error' in result) { setMsg(result.error); return; }
      setReports((prev) => prev?.filter((r) => r.id !== reportId) ?? null);
      setMsg(`Report ${action === 'dismiss' ? 'dismissed' : action === 'hide_post' ? '— post hidden' : '— author banned'}`);
    });
  }

  function handleToggleVisibility(postId: string, currentlyHidden: boolean) {
    startMutate(async () => {
      const result = await setPostVisibility(postId, !currentlyHidden);
      if ('error' in result) { setMsg(result.error); return; }
      if (!currentlyHidden) {
        // was visible, now hidden — remove from hidden list if we're in hidden view
      } else {
        setHiddenPosts((prev) => prev?.filter((p) => p.id !== postId) ?? null);
      }
      setMsg(`Post ${currentlyHidden ? 'unhidden' : 'hidden'}`);
    });
  }

  function handleToggleBan(profileId: string, currentlyBanned: boolean) {
    startMutate(async () => {
      const result = await setUserBan(profileId, !currentlyBanned);
      if ('error' in result) { setMsg(result.error); return; }
      setBannedUsers((prev) => prev?.filter((u) => u.id !== profileId) ?? null);
      setMsg(`User ${currentlyBanned ? 'unbanned' : 'banned'}`);
    });
  }

  const tabs: { id: Section; label: string; icon: React.ReactNode }[] = [
    { id: 'reports', label: 'Reports', icon: <Flag className="w-3.5 h-3.5" /> },
    { id: 'hidden',  label: 'Hidden Posts', icon: <EyeOff className="w-3.5 h-3.5" /> },
    { id: 'banned',  label: 'Banned Users', icon: <Ban className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Feed Moderation
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
            Review reported content, hidden posts, and banned users.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Section tabs */}
          <div className="flex gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => loadSection(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                  section === t.id
                    ? 'bg-slate-800/60 border-slate-600/60 text-slate-100'
                    : 'border-slate-700/40 text-slate-500 hover:text-slate-300 hover:border-slate-600/40'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {msg && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 rounded-xl px-3 py-2">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              {msg}
            </div>
          )}

          {/* Load trigger */}
          {reports === null && hiddenPosts === null && bannedUsers === null && (
            <button
              onClick={() => loadSection(section)}
              className="w-full rounded-xl border border-slate-700/60 bg-slate-800/40 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Load {tabs.find((t) => t.id === section)?.label}
            </button>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          )}

          {/* Reports */}
          {section === 'reports' && reports !== null && !isLoading && (
            <div className="space-y-3">
              {reports.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No pending reports</p>
              ) : reports.map((report) => (
                <div key={report.id} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {report.post && (
                        <>
                          <p className="text-xs font-semibold text-slate-300">
                            by {(report.post.author as { display_name: string }).display_name}
                          </p>
                          <p className="text-sm text-slate-400 mt-1 line-clamp-3">{report.post.content}</p>
                        </>
                      )}
                      <p className="text-xs text-slate-600 mt-1.5">Reason: {report.reason}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 min-h-8 rounded-lg px-3 py-0 text-xs font-semibold border-0 text-slate-100 shadow-md shadow-slate-900/25 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 hover:from-slate-500 hover:via-slate-600 hover:to-slate-700 hover:bg-gradient-to-r dark:from-slate-600 dark:via-slate-700 dark:to-slate-800 dark:hover:from-slate-500 dark:hover:via-slate-600 dark:hover:to-slate-700"
                      onClick={() => handleResolve(report.id, 'dismiss')}
                      disabled={isMutating}
                    >
                      Dismiss
                    </Button>
                    {report.post_id && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 min-h-8 rounded-lg px-3 py-0 text-xs font-semibold border-0 text-white shadow-md shadow-amber-500/25 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700 hover:bg-gradient-to-r dark:from-amber-500 dark:via-orange-500 dark:to-amber-600 dark:hover:from-amber-600 dark:hover:via-orange-600 dark:hover:to-amber-700"
                        onClick={() => handleResolve(report.id, 'hide_post')}
                        disabled={isMutating}
                      >
                        Hide Post
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="default"
                      className="h-8 min-h-8 rounded-lg px-3 py-0 text-xs font-semibold border-0 text-white shadow-md shadow-rose-500/25 bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 hover:from-rose-600 hover:via-red-600 hover:to-rose-700 hover:bg-gradient-to-r dark:from-rose-500 dark:via-red-600 dark:to-rose-600 dark:hover:from-rose-600 dark:hover:via-red-600 dark:hover:to-rose-700"
                      onClick={() => handleResolve(report.id, 'ban_author')}
                      disabled={isMutating}
                    >
                      Ban Author
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hidden posts */}
          {section === 'hidden' && hiddenPosts !== null && !isLoading && (
            <div className="space-y-3">
              {hiddenPosts.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No hidden posts</p>
              ) : hiddenPosts.map((post) => (
                <div key={post.id} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-300">{post.author.display_name}</p>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{post.content}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 min-h-8 rounded-lg px-3 py-0 text-xs font-semibold border-0 text-white shadow-md shadow-emerald-500/25 shrink-0 gap-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700 hover:bg-gradient-to-r dark:from-emerald-500 dark:via-teal-500 dark:to-emerald-600 dark:hover:from-emerald-600 dark:hover:via-teal-600 dark:hover:to-emerald-700 [&_svg]:size-3.5"
                    onClick={() => handleToggleVisibility(post.id, true)}
                    disabled={isMutating}
                  >
                    <Eye className="shrink-0" />
                    Unhide
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Banned users */}
          {section === 'banned' && bannedUsers !== null && !isLoading && (
            <div className="space-y-3">
              {bannedUsers.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No banned users</p>
              ) : bannedUsers.map((user) => (
                <div key={user.id} className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-200">{user.display_name}</p>
                    <p className="text-xs text-slate-500">@{user.username}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="h-8 min-h-8 rounded-lg px-3 py-0 text-xs font-semibold border-0 text-white shadow-md shadow-sky-500/25 shrink-0 bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 hover:from-sky-600 hover:via-cyan-600 hover:to-sky-700 hover:bg-gradient-to-r dark:from-sky-500 dark:via-cyan-500 dark:to-sky-600 dark:hover:from-sky-600 dark:hover:via-cyan-600 dark:hover:to-sky-700"
                    onClick={() => handleToggleBan(user.id, true)}
                    disabled={isMutating}
                  >
                    Unban
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
