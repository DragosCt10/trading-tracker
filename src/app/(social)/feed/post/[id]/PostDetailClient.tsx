'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PostCard from '@/components/feed/PostCard';
import CommentSection from '@/components/feed/CommentSection';
import { usePostActions } from '@/hooks/usePostActions';
import { useSocialProfile } from '@/hooks/useSocialProfile';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserDetails } from '@/hooks/useUserDetails';
import type { FeedPost, PaginatedResult, FeedComment } from '@/types/social';

interface PostDetailClientProps {
  post: FeedPost;
  initialComments: PaginatedResult<FeedComment>;
}

export default function PostDetailClient({ post, initialComments }: PostDetailClientProps) {
  const { data: userData } = useUserDetails();
  const userId = userData?.user?.id;
  const { data: ownProfile } = useSocialProfile(userId);
  const { subscription } = useSubscription({ userId });
  const { like, remove } = usePostActions(userId);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const postWithLiveComments = { ...post, comment_count: commentCount };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-0 py-6 space-y-4">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to feed
      </Link>

      <PostCard
        post={postWithLiveComments}
        currentUserId={userId}
        currentProfileId={ownProfile?.id}
        currentUserTier={subscription?.tier}
        onLike={(id) => like.mutate(id)}
        onDelete={(id) => remove.mutate(id)}
        expanded
      />

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide px-1">
          Comments · {commentCount}
        </h2>
        <CommentSection
          postId={post.id}
          currentProfileId={ownProfile?.id}
          initialComments={initialComments}
          onCountChange={(delta) => setCommentCount((prev) => Math.max(0, prev + delta))}
        />
      </div>
    </div>
  );
}
