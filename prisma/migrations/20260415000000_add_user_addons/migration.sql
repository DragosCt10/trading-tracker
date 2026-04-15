-- Add user_addons table for Starter Plus ($3.99/mo) and future addons.
--
-- Separate from `subscriptions` because:
--   1. An addon is a distinct Lemon Squeezy subscription with its own billing cycle.
--   2. The existing `subscriptions` table enforces one active row per user — addons
--      need their own identity space so Starter (free, no subscription row) users
--      can hold an addon.
--   3. Keeps the tier code path in src/lib/server/subscription.ts untouched so any
--      bug in the addon flow cannot regress Pro/Elite subscriptions.
--
-- RLS mirrors the `subscriptions` pattern exactly (baseline migration lines 1106-1108):
-- users read their own row; all writes happen via the service-role client from the
-- webhook handler and server actions. No client-side inserts/updates/deletes.

CREATE TABLE public.user_addons (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addon_type               TEXT        NOT NULL,
  status                   TEXT        NOT NULL DEFAULT 'active',
  provider                 TEXT        NOT NULL DEFAULT 'lemonsqueezy',
  provider_subscription_id TEXT,
  provider_customer_id     TEXT,
  current_period_start     TIMESTAMPTZ,
  current_period_end       TIMESTAMPTZ,
  cancel_at_period_end     BOOLEAN     NOT NULL DEFAULT FALSE,
  price_amount             INTEGER,
  tax_amount               INTEGER,
  currency                 TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One addon row per (user, addon_type). Re-subscribing after cancel upserts onto
-- the same row; the webhook handler uses onConflict: 'user_id,addon_type'.
CREATE UNIQUE INDEX user_addons_user_addon_type_key
  ON public.user_addons (user_id, addon_type);

-- Fast lookup by status for getCachedActiveAddons().
CREATE INDEX user_addons_user_status_idx
  ON public.user_addons (user_id, status);

-- Unique index on provider_subscription_id so webhook cancel events can match
-- exactly one row across both the subscriptions table and user_addons table.
CREATE UNIQUE INDEX user_addons_provider_sub_idx
  ON public.user_addons (provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

-- user_addons: users read own; all writes via service role.
-- Mirrors the subscriptions RLS policy from the baseline migration.
ALTER TABLE public.user_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own addons"
  ON public.user_addons
  FOR SELECT
  USING (auth.uid() = user_id);
