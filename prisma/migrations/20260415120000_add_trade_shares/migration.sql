-- CreateTable
CREATE TABLE "trade_shares" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "share_token" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trade_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'live',
    "strategy_id" UUID,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + '90 days'::interval),
    "trade_market" TEXT,
    "trade_direction" TEXT,
    "trade_date" DATE,

    CONSTRAINT "trade_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trade_shares_share_token_key" ON "trade_shares"("share_token");

-- CreateIndex
CREATE INDEX "idx_trade_shares_created_by" ON "trade_shares"("created_by");

-- CreateIndex: fast token lookups for active, non-expired shares
CREATE INDEX "idx_trade_shares_token_active_expires"
    ON "trade_shares"("share_token", "active", "expires_at")
    WHERE "active" = true;

-- Enable row level security (ship-blocking if omitted)
ALTER TABLE public.trade_shares ENABLE ROW LEVEL SECURITY;

-- Owner-only policies. The service-role client used for public share page reads
-- bypasses RLS by design, so no anonymous SELECT policy is needed.
CREATE POLICY "trade_shares_select_own"
    ON public.trade_shares FOR SELECT
    USING (auth.uid() = created_by);

CREATE POLICY "trade_shares_insert_own"
    ON public.trade_shares FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trade_shares_update_own"
    ON public.trade_shares FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "trade_shares_delete_own"
    ON public.trade_shares FOR DELETE
    USING (auth.uid() = created_by);
