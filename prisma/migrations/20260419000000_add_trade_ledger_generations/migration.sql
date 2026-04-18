-- Trade Ledger generation log — one row per successful PDF generation.
-- Used to enforce the monthly quota (Starter Plus: 5/mo, Pro / Elite:
-- unlimited). Append-only; no updates.

CREATE TABLE "trade_ledger_generations" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trade_ledger_generations_pkey" PRIMARY KEY ("id")
);

-- Quota queries always filter by `user_id` + month window → composite index
-- lets the count scan stay index-only.
CREATE INDEX "idx_trade_ledger_generations_user_created"
    ON "trade_ledger_generations"("user_id", "created_at" DESC);

ALTER TABLE "trade_ledger_generations"
    ADD CONSTRAINT "trade_ledger_generations_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "trade_ledger_generations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_ledger_generations_owner_all" ON "trade_ledger_generations"
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
