-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add full unique constraint on subscriptions.user_id
--    Required for upsert(onConflict: 'user_id') to work correctly.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Expand admin_roles.role CHECK to allow 'admin' in addition to 'super_admin'
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.admin_roles
  DROP CONSTRAINT IF EXISTS admin_roles_role_check;

ALTER TABLE public.admin_roles
  ADD CONSTRAINT admin_roles_role_check
    CHECK (role IN ('admin', 'super_admin'));
