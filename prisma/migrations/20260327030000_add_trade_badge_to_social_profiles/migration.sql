-- Add trade_badge column to social_profiles.
-- Stores the highest earned trade milestone ID (e.g. 'rookie_trader', 'alpha_trader').
-- Denormalised for fast feed query joins, same pattern as the 'tier' column.
ALTER TABLE public.social_profiles
  ADD COLUMN IF NOT EXISTS trade_badge VARCHAR(30);
