-- Drop user_addons table.
--
-- Context: Starter Plus has been promoted from a standalone Lemon Squeezy add-on
-- ($3.99/mo unlimited-trades unlock on the free Starter plan) to a full pricing
-- tier ($7.99/mo) that now lives in the `subscriptions` table alongside Pro.
--
-- Safety: verified empty — no paying Starter Plus add-on subscribers existed
-- when this migration was authored. CASCADE drops the RLS policies, unique
-- indexes, and foreign-key constraint in a single statement so partial state
-- is impossible.

DROP TABLE IF EXISTS public.user_addons CASCADE;
