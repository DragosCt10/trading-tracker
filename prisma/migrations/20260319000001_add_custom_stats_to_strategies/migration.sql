-- Add saved_custom_stats column to strategies table
-- Stores user-defined filter combinations as JSON array of CustomStatConfig objects

ALTER TABLE "public"."strategies"
  ADD COLUMN IF NOT EXISTS "saved_custom_stats" JSONB DEFAULT '[]';
