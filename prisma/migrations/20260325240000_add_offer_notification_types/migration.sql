-- Add offer notification types to the notification_type enum
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'pro_3mo_discount';
ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'trade_milestone_10';

-- Partial unique index to enforce one offer notification per user per type
-- (Prisma does not support WHERE clause on @@unique, so this must be raw SQL)
CREATE UNIQUE INDEX IF NOT EXISTS "feed_notifications_offer_unique"
  ON "public"."feed_notifications" ("recipient_id", "type")
  WHERE "type" IN ('pro_3mo_discount', 'trade_milestone_10');
