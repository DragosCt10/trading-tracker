-- SC3: Normalize discounts from user_settings.feature_flags JSONB into a dedicated table.
-- Replaces available_discounts, pro_retention_discount, activity_rank_up_discount, and pending_variant_revert.
-- The trade_badge field stays in feature_flags.

-- Create the new table
CREATE TABLE IF NOT EXISTS "public"."user_discounts" (
  "id"                           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"                      UUID        NOT NULL,
  "discount_type"                TEXT        NOT NULL,
  "milestone_id"                 TEXT        NOT NULL DEFAULT '__none__',
  "discount_pct"                 INTEGER     NOT NULL,
  "used"                         BOOLEAN     NOT NULL DEFAULT false,
  "coupon_code"                  TEXT,
  "generated_at"                 TIMESTAMPTZ(6),
  "expires_at"                   TIMESTAMPTZ(6),
  "achieved_at"                  TIMESTAMPTZ(6),
  "revert_subscription_id"       TEXT,
  "revert_normal_variant_id"     TEXT,
  "revert_discounted_variant_id" TEXT,
  "revert_applied_at"            TIMESTAMPTZ(6),
  "revert_attempts"              INTEGER     NOT NULL DEFAULT 0,
  "created_at"                   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"                   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "user_discounts_pkey" PRIMARY KEY ("id")
);

-- Cross-schema FK to auth.users (matches the pattern used by user_settings, subscriptions, etc.)
ALTER TABLE "public"."user_discounts"
  ADD CONSTRAINT "user_discounts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

-- Unique constraint: one discount per (user, type, milestone).
-- Uses sentinel value '__none__' for activity/retention (not NULL) because PostgreSQL
-- treats NULLs as distinct in unique constraints, which would allow unlimited rows.
CREATE UNIQUE INDEX "user_discounts_user_id_discount_type_milestone_id_key"
  ON "public"."user_discounts" ("user_id", "discount_type", "milestone_id");

-- Lookup indexes
CREATE INDEX "user_discounts_user_id_idx" ON "public"."user_discounts" ("user_id");
CREATE INDEX "user_discounts_revert_subscription_id_idx"
  ON "public"."user_discounts" ("revert_subscription_id");

-- Auto-update updated_at on row mutations
CREATE OR REPLACE FUNCTION "public"."user_discounts_set_updated_at"()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "user_discounts_updated_at"
  BEFORE UPDATE ON "public"."user_discounts"
  FOR EACH ROW EXECUTE FUNCTION "public"."user_discounts_set_updated_at"();

-- Row-level security: users can read their own discounts. All writes via service role.
ALTER TABLE "public"."user_discounts" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_discounts_select_own"
  ON "public"."user_discounts"
  FOR SELECT
  USING (auth.uid() = user_id);

-- Drop the version column from user_settings.
-- The optimistic locking was built for concurrent JSONB discount writes. With discounts
-- moved to their own table, the only remaining JSONB field is trade_badge, which is
-- always a full overwrite (idempotent). Optimistic locking is dead weight.
ALTER TABLE "public"."user_settings" DROP COLUMN IF EXISTS "version";
