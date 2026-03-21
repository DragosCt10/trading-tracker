'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PostCard from '@/components/feed/PostCard';
import CommentSection from '@/components/feed/CommentSection';
import { usePostActions } from '@/hooks/usePostActions';
import { useSocialProfile } from '@/hooks/useSocialProfile';
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
  const { like, remove } = usePostActions(userId);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 sm:px-0 py-6 space-y-4">
      <Link
        href="/feed"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to feed
      </Link>

      <PostCard
        post={post}
        currentUserId={userId}
        currentProfileId={ownProfile?.id}
        onLike={(id) => like.mutate(id)}
        onDelete={(id) => remove.mutate(id)}
        expanded
      />

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide px-1">
          Comments · {post.comment_count}
        </h2>
        <CommentSection
          postId={post.id}
          currentProfileId={ownProfile?.id}
          initialComments={initialComments}
        />
      </div>
    </div>
  );
}
