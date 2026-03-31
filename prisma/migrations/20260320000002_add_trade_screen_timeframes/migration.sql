ALTER TABLE public.live_trades
ADD COLUMN IF NOT EXISTS trade_screen_timeframes JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.backtesting_trades
ADD COLUMN IF NOT EXISTS trade_screen_timeframes JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.demo_trades
ADD COLUMN IF NOT EXISTS trade_screen_timeframes JSONB DEFAULT '[]'::jsonb;
