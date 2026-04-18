-- Snapshot the owner's display name on the share row so anonymous viewers
-- see the real name on the PDF cover without the public route needing to
-- read the auth / social_profiles tables.

ALTER TABLE "trade_ledger_shares"
    ADD COLUMN "trader_name" VARCHAR(120);
