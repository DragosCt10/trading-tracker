-- PR 4: Expand offer notification uniqueness + add (recipient_id, type) index
--
-- Context: The original feed_notifications_offer_unique index only covered
-- 'pro_3mo_discount' and 'trade_milestone_10'. All other offer types (7 more)
-- had no uniqueness constraint, allowing duplicate rows via TOCTOU races.
--
-- Step 1: Dedup any existing duplicate offer notifications (keep the oldest row).
-- Safety net — removes duplicates before the unique index is applied.
DELETE FROM "public"."feed_notifications"
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY recipient_id, "type"
             ORDER BY created_at ASC
           ) AS rn
    FROM "public"."feed_notifications"
    WHERE "type" IN (
      'pro_3mo_discount', 'trade_milestone_10', 'pro_loyalty_unlocked',
      'post_milestone',
      'trade_milestone_100', 'trade_milestone_200', 'trade_milestone_500',
      'trade_milestone_750', 'trade_milestone_1000'
    )
  ) ranked
  WHERE rn > 1
);

-- Step 2: Drop the old narrow index (only covered 2 of 9 offer types).
DROP INDEX IF EXISTS "public"."feed_notifications_offer_unique";

-- Step 3: Create expanded unique index covering all offer notification types.
-- Partial unique index — Prisma does not support WHERE clause on @@unique,
-- so this must remain raw SQL.
CREATE UNIQUE INDEX "feed_notifications_offer_unique"
  ON "public"."feed_notifications" ("recipient_id", "type")
  WHERE "type" IN (
    'pro_3mo_discount', 'trade_milestone_10', 'pro_loyalty_unlocked',
    'post_milestone',
    'trade_milestone_100', 'trade_milestone_200', 'trade_milestone_500',
    'trade_milestone_750', 'trade_milestone_1000'
  );

-- Step 4: Add composite index for fast milestone notification lookups.
-- checkTradeMilestones now uses a single .in() query on (recipient_id, type);
-- this index makes it efficient.
CREATE INDEX IF NOT EXISTS "idx_feed_notifications_recipient_type"
  ON "public"."feed_notifications" ("recipient_id", "type");
