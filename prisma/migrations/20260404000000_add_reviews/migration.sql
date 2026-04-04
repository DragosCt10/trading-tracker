-- ─── reviews ────────────────────────────────────────────────────────────────
--
-- Stores user-submitted reviews for the landing page testimonials section.
-- Users can submit one review each (unique user_id). Admins approve/reject
-- via the admin panel. Only approved reviews appear on the landing page.
--
-- RLS rules:
--   SELECT own row      — authenticated user reads their own review
--   SELECT approved     — anyone (including anon) reads approved reviews (landing page)
--   INSERT/UPDATE own   — authenticated user writes their own row
--   No DELETE for users — soft-rejection by admins instead

-- CreateTable
CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id"          UUID           NOT NULL DEFAULT gen_random_uuid(),
    "user_id"     UUID           NOT NULL,
    "text"        VARCHAR(500)   NOT NULL,
    "rating"      SMALLINT,
    "status"      VARCHAR(20)    NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_user_id_key" ON "public"."reviews"("user_id");

CREATE INDEX IF NOT EXISTS "idx_reviews_status"  ON "public"."reviews"("status");
CREATE INDEX IF NOT EXISTS "idx_reviews_user_id" ON "public"."reviews"("user_id");

-- AddForeignKey
ALTER TABLE "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "auth"."users"("id")
    ON DELETE CASCADE
    ON UPDATE NO ACTION;

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;

-- Approved reviews are public (landing page, no login required)
CREATE POLICY "reviews_select_approved" ON "public"."reviews"
  FOR SELECT
  USING (status = 'approved');

-- Authenticated users can read their own review (any status)
CREATE POLICY "reviews_select_own" ON "public"."reviews"
  FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can insert their own review
CREATE POLICY "reviews_insert_own" ON "public"."reviews"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own review
-- (status is reset to 'pending' in server-side logic, not enforced by RLS)
CREATE POLICY "reviews_update_own" ON "public"."reviews"
  FOR UPDATE
  USING (auth.uid() = user_id);
