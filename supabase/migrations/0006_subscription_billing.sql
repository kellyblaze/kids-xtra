-- Stripe subscription state belongs to the family account. Existing families are
-- grandfathered as active; newly created families explicitly start incomplete.
ALTER TABLE families
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE families ADD CONSTRAINT families_subscription_status_check CHECK (
    subscription_status IN (
      'active', 'trialing', 'past_due', 'incomplete', 'incomplete_expired',
      'canceled', 'unpaid', 'paused'
    )
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS families_stripe_customer_id_key
  ON families (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS families_stripe_subscription_id_key
  ON families (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
