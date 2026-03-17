-- ─────────────────────────────────────────────────────────────────────────────
-- 1. subscriptions table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                      TEXT NOT NULL DEFAULT 'starter'
                              CHECK (tier IN ('starter', 'pro', 'elite')),
  status                    TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','canceled','past_due','trialing','admin_granted','refunded')),
  billing_period            TEXT
                              CHECK (billing_period IN ('monthly', 'annual')),
  provider                  TEXT NOT NULL DEFAULT 'admin'
                              CHECK (provider IN ('polar','stripe','paddle','admin')),
  provider_subscription_id  TEXT,
  provider_customer_id      TEXT,
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active subscription per user
CREATE UNIQUE INDEX subscriptions_user_active_idx
  ON public.subscriptions (user_id)
  WHERE status IN ('active', 'trialing', 'admin_granted');

-- Webhook lookup by provider subscription ID
CREATE INDEX subscriptions_provider_sub_idx
  ON public.subscriptions (provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

-- RLS: users can only SELECT their own row; all writes via service role
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. admin_roles table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE public.admin_roles (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'super_admin'
                CHECK (role IN ('super_admin')),
  granted_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No client read/write — all access via service role
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No client access to admin_roles" ON public.admin_roles
  AS RESTRICTIVE
  FOR ALL
  USING (FALSE);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Bootstrap: insert yourself as first super admin (replace with your UUID)
-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT INTO admin_roles (user_id, role) VALUES ('your-user-uuid-here', 'super_admin');
