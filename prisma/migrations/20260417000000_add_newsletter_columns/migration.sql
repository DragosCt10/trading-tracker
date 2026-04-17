-- Add newsletter subscription columns to user_settings
ALTER TABLE "public"."user_settings"
  ADD COLUMN "newsletter_subscribed" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "newsletter_unsubscribe_token" UUID DEFAULT gen_random_uuid();

-- Backfill existing rows that may have NULL unsubscribe tokens
UPDATE "public"."user_settings"
SET "newsletter_unsubscribe_token" = gen_random_uuid()
WHERE "newsletter_unsubscribe_token" IS NULL;

-- Create unique index for token-based unsubscribe lookups
CREATE UNIQUE INDEX "user_settings_newsletter_unsubscribe_token_key"
  ON "public"."user_settings" ("newsletter_unsubscribe_token");
