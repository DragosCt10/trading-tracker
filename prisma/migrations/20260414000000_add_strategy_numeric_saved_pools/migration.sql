-- Add numeric saved pools to strategies
--
-- Mirrors the existing saved_setup_types / saved_liquidity_types pattern so
-- that the four numeric fields used in NewTradeModal (displacement size,
-- SL size, risk per trade, R:R ratio) get the same suggestion + pin + edit
-- combobox UX. Values are stored as text[] (not numeric[]) to keep the
-- merge/edit logic identical to the existing string-based saved pools and
-- to allow trivial reuse of CommonCombobox.

ALTER TABLE public.strategies
  ADD COLUMN IF NOT EXISTS saved_displacement_sizes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.strategies
  ADD COLUMN IF NOT EXISTS saved_sl_sizes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.strategies
  ADD COLUMN IF NOT EXISTS saved_risk_per_trades TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.strategies
  ADD COLUMN IF NOT EXISTS saved_rr_ratios TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
