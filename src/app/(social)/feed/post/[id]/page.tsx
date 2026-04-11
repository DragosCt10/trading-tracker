import { notFound } from 'next/navigation';
import { getPost } from '@/lib/server/feedPosts';
import { getComments } from '@/lib/server/feedInteractions';
import PostDetailClient from './PostDetailClient';

export const revalidate = 30;

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [post, comments] = await Promise.all([
    getPost(id),
    getComments(id, undefined, 20),
  ]);

  if (!post) notFound();

  return <PostDetailClient post={post} initialComments={comments} />;
}
