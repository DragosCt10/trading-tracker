import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export function useNewPostsNotifier(currentProfileId: string | undefined, enabled: boolean) {
  const [newPostCount, setNewPostCount] = useState(0);

  useEffect(() => {
    if (!enabled || !currentProfileId) return;

    // S5: createClient() must be inside useEffect — not at module level —
    // so it only runs client-side and doesn't hold a connection during SSR.
    const supabase = createClient();

    const channel = supabase
      .channel('feed-new-posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feed_posts',
          // S4: Only notify for public-feed posts (channel_id IS NULL).
          // Posts in private channels would leak membership signals to non-members.
          filter: 'channel_id=is.null',
        },
        (payload) => {
          // Skip own posts — they already appear immediately via mutation invalidation
          if ((payload.new as { author_id: string }).author_id !== currentProfileId) {
            setNewPostCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentProfileId, enabled]);

  const clearCount = () => setNewPostCount(0);

  return { newPostCount, clearCount };
}
