-- Add 'lemonsqueezy' to the subscriptions provider CHECK constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_check;

ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_provider_check CHECK (
  provider = ANY (
    ARRAY[
      'polar'::text,
      'stripe'::text,
      'paddle'::text,
      'admin'::text,
      'lemonsqueezy'::text
    ]
  )
);
