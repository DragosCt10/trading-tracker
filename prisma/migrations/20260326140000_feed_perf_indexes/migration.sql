-- ============================================================
-- Feed performance indexes — D-7.1–D-7.3
-- Composite indexes on the four hottest query paths in the
-- social feed to avoid full table scans on large datasets.
-- ============================================================

-- feed_posts: rate-limit check (author_id + created_at window) and
--             profile-page post listing (author_id ordered by created_at)
CREATE INDEX IF NOT EXISTS idx_feed_posts_author_created
  ON public.feed_posts(author_id, created_at DESC);

-- feed_comments: comment rate-limit check (author_id + created_at window)
CREATE INDEX IF NOT EXISTS idx_feed_comments_author_created
  ON public.feed_comments(author_id, created_at DESC);

-- feed_notifications: unread-count query and notification list
--   (recipient_id, is_read, created_at DESC) covers both
--   WHERE recipient_id = ? AND is_read = false  (count)
--   WHERE recipient_id = ?  ORDER BY created_at DESC  (list)
CREATE INDEX IF NOT EXISTS idx_feed_notifications_recipient_read
  ON public.feed_notifications(recipient_id, is_read, created_at DESC);

-- feed_reports: reporter rate-limit check (reporter_id + created_at window)
CREATE INDEX IF NOT EXISTS idx_feed_reports_reporter_created
  ON public.feed_reports(reporter_id, created_at DESC);
