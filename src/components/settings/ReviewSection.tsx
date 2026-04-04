'use client';

import { useState, useTransition, useEffect } from 'react';
import { Star, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { submitReview, getUserReview } from '@/lib/server/reviews';
import type { Review } from '@/lib/server/reviews';

const MAX_CHARS = 500;

const STATUS_CONFIG = {
  pending: { label: 'Pending review', className: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-200 dark:border-amber-800' },
  approved: { label: 'Approved — live on landing page', className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-200 dark:border-emerald-800' },
  rejected: { label: 'Not approved', className: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-200 dark:border-rose-800' },
};

interface StarPickerProps {
  value: number;
  onChange: (v: number) => void;
}

function StarPicker({ value, onChange }: StarPickerProps) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < (hovered || value);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            onMouseEnter={() => setHovered(i + 1)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110 focus:outline-none"
            aria-label={`Rate ${i + 1} star${i !== 0 ? 's' : ''}`}
          >
            <Star
              className={`w-5 h-5 transition-colors ${filled ? 'text-amber-400 fill-amber-400' : 'text-slate-400 dark:text-slate-600'}`}
            />
          </button>
        );
      })}
      {value > 0 && (
        <button
          type="button"
          onClick={() => onChange(0)}
          className="ml-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          Clear
        </button>
      )}
    </div>
  );
}

export default function ReviewSection({ socialProfile }: { socialProfile: { display_name?: string } | null }) {
  const [text, setText] = useState('');
  const [rating, setRating] = useState(0);
  const [existing, setExisting] = useState<Review | null | undefined>(undefined);
  const [isLoadingReview, startLoad] = useTransition();
  const [isPending, startSubmit] = useTransition();
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    startLoad(async () => {
      const result = await getUserReview();
      if ('data' in result) {
        setExisting(result.data);
        if (result.data) {
          setText(result.data.text);
          setRating(result.data.rating ?? 0);
        }
      } else {
        setExisting(null);
      }
    });
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    startSubmit(async () => {
      const result = await submitReview(text.trim(), rating > 0 ? rating : undefined);
      if ('error' in result) {
        setErrorMsg(result.error ?? '');
        return;
      }
      setSuccessMsg(existing ? 'Review updated — it will be reviewed again before appearing live.' : 'Review submitted — we\'ll review it shortly.');
      setExisting((prev) => ({
        ...(prev ?? {
          id: '',
          user_id: '',
          reviewed_by: null,
          reviewed_at: null,
          created_at: new Date().toISOString(),
        }),
        text: text.trim(),
        rating: rating > 0 ? rating : null,
        status: 'pending',
        updated_at: new Date().toISOString(),
      } as Review));
    });
  }

  const charsLeft = MAX_CHARS - text.length;
  const isEditing = !!existing;

  // Approved — show thank you, no editing allowed
  if (!isLoadingReview && existing?.status === 'approved') {
    return (
      <div className="rounded-2xl border border-emerald-200/50 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/50 via-white/30 to-emerald-50/50 dark:from-emerald-950/20 dark:via-slate-900/20 dark:to-emerald-950/20 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6">
        <div className="flex flex-col items-start gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                Thank you for your review!
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your review is live on the landing page.
              </p>
            </div>
          </div>

          {existing.rating && (
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i < existing.rating! ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
                />
              ))}
            </div>
          )}

          <blockquote className="border-l-2 border-emerald-400/50 pl-3 text-sm text-slate-600 dark:text-slate-300 italic leading-relaxed">
            &ldquo;{existing.text}&rdquo;
          </blockquote>

          <a
            href="/#testimonials"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            See it on the landing page
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-300/40 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/50 via-white/30 to-slate-50/50 dark:from-slate-800/30 dark:via-slate-900/20 dark:to-slate-800/30 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-sm p-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 mb-1">
          {isEditing ? 'Your Review' : 'Leave a Review'}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isEditing
            ? 'Update your review below. Edits go back into the moderation queue.'
            : 'Share your experience. Approved reviews appear on our landing page.'}
        </p>
      </div>

      {/* No social profile warning */}
      {!socialProfile?.display_name && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200/60 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Set up your profile first — your display name and avatar will be shown with your review.</span>
        </div>
      )}

      {/* Existing status badge */}
      {isEditing && existing?.status && (
        <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CONFIG[existing.status as keyof typeof STATUS_CONFIG]?.className ?? ''}`}>
          {STATUS_CONFIG[existing.status as keyof typeof STATUS_CONFIG]?.label ?? existing.status}
        </div>
      )}

      {isLoadingReview && (
        <div className="space-y-4">
          {/* Star rating row */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-16 rounded-md" />
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-5 rounded-sm" />
              ))}
            </div>
          </div>
          {/* Textarea */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-14 rounded-md" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-3 w-36 rounded-md ml-auto" />
          </div>
          {/* Submit button */}
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      )}

      {!isLoadingReview && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Star rating */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Rating <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <StarPicker value={rating} onChange={setRating} />
          </div>

          {/* Review text */}
          <div className="space-y-1.5">
            <label htmlFor="review-text" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Review
            </label>
            <Textarea
              id="review-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tell us about your experience with the platform…"
              rows={4}
              maxLength={MAX_CHARS}
              required
              className="rounded-2xl border border-slate-200/70 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 backdrop-blur-xl shadow-lg shadow-slate-900/5 dark:shadow-black/40 themed-focus text-slate-900 dark:text-slate-50 transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none"
            />
            <p className={`text-xs text-right ${charsLeft < 50 ? 'text-amber-500' : 'text-slate-400'}`}>
              {charsLeft} characters remaining
            </p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/60 dark:bg-rose-950/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-950/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {successMsg}
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending || !text.trim() || !socialProfile?.display_name}
            className="themed-btn-primary cursor-pointer relative overflow-hidden rounded-xl text-white font-semibold px-4 py-2 group border-0 disabled:opacity-60 [&_svg]:text-white"
          >
            <span className="relative z-10 flex items-center justify-center gap-2 text-sm">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isPending ? 'Submitting…' : isEditing ? 'Update Review' : 'Submit Review'}
            </span>
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700" />
          </Button>
        </form>
      )}
    </div>
  );
}
