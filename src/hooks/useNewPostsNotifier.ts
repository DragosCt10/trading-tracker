import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

export function useNewPostsNotifier(currentProfileId: string | undefined, enabled: boolean) {
  const [newPostCount, setNewPostCount] = useState(0);

  useEffect(() => {
    if (!enabled || !currentProfileId) return;

    const channel = supabase
      .channel('feed-new-posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, (payload) => {
        // Skip own posts — they already appear immediately via mutation invalidation
        if ((payload.new as { author_id: string }).author_id !== currentProfileId) {
          setNewPostCount((c) => c + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentProfileId, enabled]);

  const clearCount = () => setNewPostCount(0);

  return { newPostCount, clearCount };
}
