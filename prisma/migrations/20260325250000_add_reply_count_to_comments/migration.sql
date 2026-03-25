-- ============================================================
-- Add reply_count denormalized column to feed_comments
--
-- Eliminates the second DB query in getComments() that fetched
-- all reply rows and counted them in JS. Instead, reply_count
-- is maintained by triggers and read directly in the SELECT.
-- ============================================================

-- 1. Add the column
ALTER TABLE public.feed_comments
  ADD COLUMN IF NOT EXISTS reply_count integer NOT NULL DEFAULT 0;

-- 2. Backfill existing data
UPDATE public.feed_comments parent
SET reply_count = (
  SELECT COUNT(*)
  FROM public.feed_comments child
  WHERE child.parent_id = parent.id
    AND child.is_hidden = false
);

-- 3. Trigger function: increment parent reply_count on new reply
CREATE OR REPLACE FUNCTION public.increment_comment_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    UPDATE public.feed_comments
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Trigger function: decrement parent reply_count on delete
CREATE OR REPLACE FUNCTION public.decrement_comment_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.parent_id IS NOT NULL THEN
    UPDATE public.feed_comments
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.parent_id;
  END IF;
  RETURN OLD;
END;
$$;

-- 5. Attach triggers
DROP TRIGGER IF EXISTS trg_comment_reply_count_insert ON public.feed_comments;
CREATE TRIGGER trg_comment_reply_count_insert
  AFTER INSERT ON public.feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.increment_comment_reply_count();

DROP TRIGGER IF EXISTS trg_comment_reply_count_delete ON public.feed_comments;
CREATE TRIGGER trg_comment_reply_count_delete
  AFTER DELETE ON public.feed_comments
  FOR EACH ROW EXECUTE FUNCTION public.decrement_comment_reply_count();
