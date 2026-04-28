-- Add futures account type with per-symbol contract spec support.
--
-- Schema changes:
--   1. account_settings.account_type — 'standard' | 'futures' (default 'standard').
--   2. (live|demo|backtesting)_trades — futures-only fields:
--        num_contracts, dollar_per_sl_unit_override (tier-3 escape hatch),
--        calculated_risk_dollars (snapshot at write time so stats stay correct
--        if the catalog changes later), spec_source (debug provenance).
--   3. user_settings.custom_futures_specs — per-user JSONB array of saved
--        contract specs for symbols not in the canonical FUTURES_SPECS catalog.
--
-- All new columns are nullable / defaulted so existing rows are unaffected.
-- CHECK constraints enforce the enum values at the DB layer per OV2
-- (memory: tier_check_constraint precedent — VARCHAR enums must be
-- DB-enforced or drift bugs eventually leak through).

-- ─── 1. account_settings ────────────────────────────────────────────────────
ALTER TABLE "public"."account_settings"
  ADD COLUMN IF NOT EXISTS "account_type" VARCHAR(20) NOT NULL DEFAULT 'standard';

ALTER TABLE "public"."account_settings"
  DROP CONSTRAINT IF EXISTS "account_settings_account_type_check";

ALTER TABLE "public"."account_settings" ADD CONSTRAINT "account_settings_account_type_check" CHECK (
  account_type = ANY (ARRAY['standard'::text, 'futures'::text])
);

-- ─── 2. trade tables (live / demo / backtesting) ────────────────────────────
ALTER TABLE "public"."live_trades"
  ADD COLUMN IF NOT EXISTS "num_contracts"               DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "dollar_per_sl_unit_override" DECIMAL(12, 4),
  ADD COLUMN IF NOT EXISTS "calculated_risk_dollars"     DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "spec_source"                 VARCHAR(20);

ALTER TABLE "public"."demo_trades"
  ADD COLUMN IF NOT EXISTS "num_contracts"               DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "dollar_per_sl_unit_override" DECIMAL(12, 4),
  ADD COLUMN IF NOT EXISTS "calculated_risk_dollars"     DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "spec_source"                 VARCHAR(20);

ALTER TABLE "public"."backtesting_trades"
  ADD COLUMN IF NOT EXISTS "num_contracts"               DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS "dollar_per_sl_unit_override" DECIMAL(12, 4),
  ADD COLUMN IF NOT EXISTS "calculated_risk_dollars"     DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "spec_source"                 VARCHAR(20);

-- spec_source CHECK on each trade table (NULL allowed for standard trades).
ALTER TABLE "public"."live_trades"
  DROP CONSTRAINT IF EXISTS "live_trades_spec_source_check";
ALTER TABLE "public"."live_trades" ADD CONSTRAINT "live_trades_spec_source_check" CHECK (
  spec_source IS NULL
  OR spec_source = ANY (ARRAY['hardcoded'::text, 'custom'::text, 'override'::text])
);

ALTER TABLE "public"."demo_trades"
  DROP CONSTRAINT IF EXISTS "demo_trades_spec_source_check";
ALTER TABLE "public"."demo_trades" ADD CONSTRAINT "demo_trades_spec_source_check" CHECK (
  spec_source IS NULL
  OR spec_source = ANY (ARRAY['hardcoded'::text, 'custom'::text, 'override'::text])
);

ALTER TABLE "public"."backtesting_trades"
  DROP CONSTRAINT IF EXISTS "backtesting_trades_spec_source_check";
ALTER TABLE "public"."backtesting_trades" ADD CONSTRAINT "backtesting_trades_spec_source_check" CHECK (
  spec_source IS NULL
  OR spec_source = ANY (ARRAY['hardcoded'::text, 'custom'::text, 'override'::text])
);

-- ─── 3. user_settings ───────────────────────────────────────────────────────
ALTER TABLE "public"."user_settings"
  ADD COLUMN IF NOT EXISTS "custom_futures_specs" JSONB NOT NULL DEFAULT '[]'::jsonb;
