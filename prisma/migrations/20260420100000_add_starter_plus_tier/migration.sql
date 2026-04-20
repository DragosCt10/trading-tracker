-- Add 'starter_plus' and 'elite' to the subscriptions tier CHECK constraint.
--
-- Context: Starter Plus was promoted from an add-on to a full pricing tier in
-- migration 20260415130000_drop_user_addons, but the tier CHECK constraint on
-- the subscriptions table was never updated. The LemonSqueezy webhook upsert
-- fails for new Starter Plus subscribers with:
--   "new row for relation 'subscriptions' violates check constraint 'subscriptions_tier_check'"
--
-- Elite is included pre-emptively since it is already in TierId / TIER_DEFINITIONS.

ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_tier_check;

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tier_check CHECK (
  tier = ANY (
    ARRAY[
      'starter'::text,
      'starter_plus'::text,
      'pro'::text,
      'elite'::text
    ]
  )
);
