-- Trade Ledger feature — tables for saved report templates and shareable public reports.
-- Apply manually: `psql ... -f migration.sql` or via Supabase SQL editor.

-- ============================================================================
-- trade_ledger_templates
-- ============================================================================

CREATE TABLE "trade_ledger_templates" (
    "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"    UUID NOT NULL,
    "name"       VARCHAR(255) NOT NULL,
    "config"     JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trade_ledger_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_trade_ledger_templates_user_id" ON "trade_ledger_templates"("user_id");

ALTER TABLE "trade_ledger_templates"
    ADD CONSTRAINT "trade_ledger_templates_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- RLS: owner-only access
ALTER TABLE "trade_ledger_templates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_ledger_templates_owner_all" ON "trade_ledger_templates"
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- ============================================================================
-- trade_ledger_shares
-- ============================================================================

CREATE TABLE "trade_ledger_shares" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id"         UUID NOT NULL,
    "token"           VARCHAR(32) NOT NULL,
    "config"          JSONB NOT NULL,
    "trades_snapshot" JSONB NOT NULL,
    "aggregates"      JSONB NOT NULL,
    "integrity_hash"  VARCHAR(64) NOT NULL,
    "expires_at"      TIMESTAMPTZ(6),
    "revoked_at"      TIMESTAMPTZ(6),
    "view_count"      INTEGER NOT NULL DEFAULT 0,
    "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trade_ledger_shares_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trade_ledger_shares_token_key" ON "trade_ledger_shares"("token");
CREATE INDEX "idx_trade_ledger_shares_user_id" ON "trade_ledger_shares"("user_id");
CREATE INDEX "idx_trade_ledger_shares_token" ON "trade_ledger_shares"("token");

ALTER TABLE "trade_ledger_shares"
    ADD CONSTRAINT "trade_ledger_shares_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- RLS: owner manages their own shares; public token lookups happen via service_role (server actions).
ALTER TABLE "trade_ledger_shares" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trade_ledger_shares_owner_all" ON "trade_ledger_shares"
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
