-- Add price and tax columns to subscriptions table
-- Stores the actual amount charged (tax inclusive) and tax breakdown from Polar order.created webhook

ALTER TABLE "public"."subscriptions"
  ADD COLUMN IF NOT EXISTS "price_amount" INTEGER,
  ADD COLUMN IF NOT EXISTS "tax_amount"   INTEGER,
  ADD COLUMN IF NOT EXISTS "currency"     TEXT;
