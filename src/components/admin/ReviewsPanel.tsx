'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { Star, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getReviewsByStatus, setReviewStatus } from '@/lib/server/reviews';
import type { Review } from '@/lib/server/reviews';

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150';

type Tab = 'pending' | 'approved';

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPanel() {
  const [tab, setTab] = useState<Tab>('pending');
  const [pendingReviews, setPendingReviews] = useState<Review[] | null>(null);
  const [approvedReviews, setApprovedReviews] = useState<Review[] | null>(null);
  const [isLoading, startLoad] = useTransition();
  const [isMutating, startMutate] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const reviews = tab === 'pending' ? pendingReviews : approvedReviews;
  const setReviews = tab === 'pending' ? setPendingReviews : setApprovedReviews;

  function loadReviews() {
    setMsg(null);
    startLoad(async () => {
      const result = await getReviewsByStatus(tab);
      if ('error' in result) {
        setMsg(result.error);
        return;
      }
      setReviews(result.data);
    });
  }

  function handleSetStatus(reviewId: string, status: 'approved' | 'rejected' | 'pending') {
    startMutate(async () => {
      const result = await setReviewStatus(reviewId, status);
      if ('error' in result) {
        setMsg(result.error);
        return;
      }
      // Remove from current list
      setReviews((prev) => prev?.filter((r) => r.id !== reviewId) ?? null);

      if (status === 'pending') {
        // Revoked → switch to Pending tab and reload so the review is visible there
        setTab('pending');
        setMsg('Review revoked — see it in the Pending tab.');
        startLoad(async () => {
          const fresh = await getReviewsByStatus('pending');
          if ('data' in fresh) setPendingReviews(fresh.data);
        });
      } else {
        const labels: Record<string, string> = { approved: 'approved', rejected: 'rejected' };
        setMsg(`Review ${labels[status]}.`);
      }
    });
  }

  function switchTab(next: Tab) {
    setTab(next);
    setMsg(null);
  }

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            Review Moderation
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
            Approve, reject, or revoke user-submitted reviews for the landing page.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-slate-900/40 border border-slate-700/60 w-fit">
            {(['pending', 'approved'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => switchTab(t)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                  tab === t
                    ? 'bg-slate-700 text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {msg && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-800/40 rounded-xl px-3 py-2">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              {msg}
            </div>
          )}

          {reviews === null && (
            <button
              onClick={loadReviews}
              className="w-full rounded-xl border border-slate-700/60 bg-slate-800/40 py-3 text-sm text-slate-400 hover:text-slate-200 transition-colors capitalize"
            >
              Load {tab} Reviews
            </button>
          )}

          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          )}

          {reviews !== null && !isLoading && (
            <div className="space-y-3">
              {reviews.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No {tab} reviews</p>
              ) : (
                reviews.map((review) => {
                  const author = Array.isArray(review.author) ? review.author[0] : review.author;
                  return (
                    <div
                      key={review.id}
                      className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-4 space-y-3"
                    >
                      {/* Author */}
                      <div className="flex items-center gap-2.5">
                        <Image
                          src={author?.avatar_url ?? FALLBACK_AVATAR}
                          alt={author?.display_name ?? 'User'}
                          width={32}
                          height={32}
                          className="rounded-full object-cover ring-1 ring-white/10"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-200 truncate">
                            {author?.display_name ?? 'Unknown'}
                          </p>
                          {author?.username && (
                            <p className="text-[11px] text-slate-500 truncate">@{author.username}</p>
                          )}
                        </div>
                        <div className="ml-auto flex items-center gap-2 shrink-0">
                          <StarRating rating={review.rating} />
                          <span className="text-[11px] text-slate-600">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Review text */}
                      <p className="text-sm text-slate-300 leading-relaxed">{review.text}</p>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        {tab === 'pending' ? (
                          <>
                            <Button
                              size="sm"
                              disabled={isMutating}
                              onClick={() => handleSetStatus(review.id, 'approved')}
                              className="h-8 min-h-8 rounded-lg px-3 py-0 text-xs font-semibold border-0 text-white shadow-md shadow-emerald-500/25 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:via-teal-600 hover:to-emerald-700"
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              disabled={isMutating}
                              onClick={() => handleSetStatus(review.id, 'rejected')}
                              className="h-8 min-h-8 rounded-lg px-3 py-0 text-xs font-semibold border-0 text-white shadow-md shadow-rose-500/25 bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 hover:from-rose-600 hover:via-red-600 hover:to-rose-700"
                            >
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isMutating}
                            onClick={() => handleSetStatus(review.id, 'pending')}
                            className="h-8 min-h-8 rounded-lg px-3 py-0 text-xs font-semibold border-0 text-white shadow-md shadow-amber-500/25 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:via-orange-600 hover:to-amber-700"
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
