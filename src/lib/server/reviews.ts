'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from './supabaseAdmin';
import { getCachedUserSession } from './session';
import { isAdmin } from './admin';
import { checkRateLimit } from '@/lib/rateLimit';
import type { Testimonial } from '@/components/ui/testimonial-v2';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Review {
  id: string;
  user_id: string;
  text: string;
  rating: number | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  author?: {
    display_name: string;
    username: string;
    avatar_url: string | null;
    tier: string;
  } | null;
}

type ActionResult<T = true> = { data: T; error?: never } | { error: string; data?: never };

// ─── Guard ────────────────────────────────────────────────────────────────────

async function assertAdmin(): Promise<ActionResult> {
  const allowed = await isAdmin();
  if (!allowed) return { error: 'Unauthorized' };
  return { data: true };
}

// ─── User actions ─────────────────────────────────────────────────────────────

export async function submitReview(
  text: string,
  rating?: number
): Promise<ActionResult> {
  const session = await getCachedUserSession();
  if (!session?.user) return { error: 'Not authenticated' };

  const userId = session.user.id;

  const allowed = await checkRateLimit(`review:submit:${userId}`, 3, 3_600_000);
  if (!allowed) return { error: 'Too many requests. Please try again later.' };

  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 500) return { error: 'Review must be between 1 and 500 characters.' };
  if (rating !== undefined && (rating < 1 || rating > 5 || !Number.isInteger(rating))) {
    return { error: 'Rating must be an integer between 1 and 5.' };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from('reviews').upsert(
    {
      user_id: userId,
      text: trimmed,
      rating: rating ?? null,
      status: 'pending',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) return { error: 'Failed to submit review. Please try again.' };
  return { data: true };
}

export async function getUserReview(): Promise<ActionResult<Review | null>> {
  const session = await getCachedUserSession();
  if (!session?.user) return { error: 'Not authenticated' };

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) return { error: 'Failed to fetch review.' };
  return { data: data as Review | null };
}

// ─── Admin actions ────────────────────────────────────────────────────────────

export async function getPendingReviews(): Promise<ActionResult<Review[]>> {
  const guard = await assertAdmin();
  if (guard.error) return guard;

  const supabase = createAdminClient();
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) return { error: 'Failed to fetch pending reviews.' };
  if (!reviews || reviews.length === 0) return { data: [] };

  type ReviewRow = { user_id: string; [key: string]: unknown };
  type ProfileRow = { user_id: string; display_name: string; username: string; avatar_url: string | null; tier: string };
  const typedReviews = reviews as ReviewRow[];
  const userIds = typedReviews.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from('social_profiles')
    .select('user_id, display_name, username, avatar_url, tier')
    .in('user_id', userIds);

  const profileMap = new Map((profiles as ProfileRow[] ?? []).map((p) => [p.user_id, p]));
  const result = typedReviews.map((r) => ({ ...r, author: profileMap.get(r.user_id) ?? null }));

  return { data: result as Review[] };
}

export async function getReviewsByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<ActionResult<Review[]>> {
  const guard = await assertAdmin();
  if (guard.error) return guard;

  const supabase = createAdminClient();
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('status', status)
    .order('updated_at', { ascending: false });

  if (error) return { error: `Failed to fetch ${status} reviews.` };
  if (!reviews || reviews.length === 0) return { data: [] };

  type ReviewRow = { user_id: string; [key: string]: unknown };
  type ProfileRow = { user_id: string; display_name: string; username: string; avatar_url: string | null; tier: string };
  const typedReviews = reviews as ReviewRow[];
  const userIds = typedReviews.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from('social_profiles')
    .select('user_id, display_name, username, avatar_url, tier')
    .in('user_id', userIds);

  const profileMap = new Map((profiles as ProfileRow[] ?? []).map((p) => [p.user_id, p]));
  const result = typedReviews.map((r) => ({ ...r, author: profileMap.get(r.user_id) ?? null }));

  return { data: result as Review[] };
}

export async function setReviewStatus(
  reviewId: string,
  status: 'approved' | 'rejected' | 'pending'
): Promise<ActionResult> {
  const guard = await assertAdmin();
  if (guard.error) return guard;

  const session = await getCachedUserSession();
  if (!session?.user) return { error: 'Not authenticated' };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('reviews')
    .update({
      status,
      reviewed_by: session.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (error) return { error: 'Failed to update review status.' };

  revalidatePath('/');
  return { data: true };
}

// ─── Public (landing page) ────────────────────────────────────────────────────

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150';

export async function getApprovedReviews(): Promise<Testimonial[]> {
  const supabase = createAdminClient();
  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('text, user_id, rating')
    .eq('status', 'approved')
    .order('reviewed_at', { ascending: false })
    .limit(12);

  if (error || !reviews || reviews.length === 0) return [];

  type ReviewRow = { text: string; user_id: string; rating: number | null };
  type ProfileRow = { user_id: string; display_name: string | null; avatar_url: string | null; tier: string | null; trader_style: string | null };
  const typedReviews = reviews as ReviewRow[];
  const userIds = typedReviews.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from('social_profiles')
    .select('user_id, display_name, avatar_url, tier, trader_style')
    .in('user_id', userIds);

  const profileMap = new Map((profiles as ProfileRow[] ?? []).map((p) => [p.user_id, p]));

  return typedReviews.map((row) => {
    const author = profileMap.get(row.user_id);
    return {
      text: row.text,
      image: author?.avatar_url ?? FALLBACK_AVATAR,
      name: author?.display_name ?? 'Trader',
      role: author?.trader_style ?? 'Trader',
      rating: row.rating ?? undefined,
    };
  });
}

function tierToRole(tier: string): string {
  switch (tier) {
    case 'elite': return 'Elite Trader';
    case 'pro': return 'Pro Trader';
    default: return 'Trader';
  }
}
