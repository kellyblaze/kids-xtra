BEGIN;

-- Parental consent records (COPPA §312.5)
-- Stores a verifiable consent record per family before any child data is collected.
-- IP is HMAC-hashed (same approach as auth_rate_limits) — PII-safe.

CREATE TABLE IF NOT EXISTS public.parental_consents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id        uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  parent_user_id   uuid NOT NULL,
  consent_method   text NOT NULL,          -- 'terms_acceptance' | 'stripe_billing'
  policy_version   text NOT NULL,          -- e.g. '2026-11'
  ip_hash          text,                   -- HMAC-SHA256 of IP, same as auth_rate_limits
  consented_at     timestamptz NOT NULL DEFAULT now()
);

-- One consent record per family per policy version is sufficient
CREATE UNIQUE INDEX IF NOT EXISTS parental_consents_family_version
  ON public.parental_consents (family_id, policy_version);

-- RLS: parents can only read their own family's consent record
ALTER TABLE public.parental_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parental_consents FORCE ROW LEVEL SECURITY;

CREATE POLICY "parental_consents_select"
  ON public.parental_consents FOR SELECT
  USING (family_id = my_family_id());

-- INSERT is restricted to service_role to prevent clients from self-signing consent
REVOKE INSERT, UPDATE, DELETE ON TABLE public.parental_consents FROM PUBLIC, anon, authenticated;

-- Self-verification: confirm privileges were applied correctly
DO $$
DECLARE
  has_insert bool;
BEGIN
  SELECT has_table_privilege('authenticated', 'public.parental_consents', 'INSERT')
  INTO has_insert;
  IF has_insert THEN
    RAISE EXCEPTION 'SECURITY: authenticated role still has INSERT on parental_consents';
  END IF;
END $$;

-- Add consent_recorded flag to families for quick O(1) check
ALTER TABLE public.families
  ADD COLUMN IF NOT EXISTS consent_recorded boolean NOT NULL DEFAULT false;

COMMIT;
