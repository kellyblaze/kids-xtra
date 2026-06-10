-- ─── Phase 1 column additions ─────────────────────────────────────────────────
-- Adds columns referenced by server actions that were missing from the
-- initial schema, plus INSERT policies needed for the signup flow.

-- chores: photo requirement flag
ALTER TABLE chores
  ADD COLUMN IF NOT EXISTS requires_photo boolean NOT NULL DEFAULT false;

-- chore_completions: photo proof + chore_id denormalisation
ALTER TABLE chore_completions
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS chore_id uuid REFERENCES chores(id);

-- chore_assignments: soft-delete flag (used by kid missions query)
ALTER TABLE chore_assignments
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- rewards: split quantity_limit into available + running redeemed counter
ALTER TABLE rewards
  ADD COLUMN IF NOT EXISTS quantity_available     integer,
  ADD COLUMN IF NOT EXISTS quantity_redeemed      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS available_to_child_ids uuid[];

-- ─── INSERT policies needed for signup ────────────────────────────────────────

-- Families can be created by any authenticated user (they have no parent_profile
-- yet at signup time so my_family_id() returns NULL).
CREATE POLICY "families_insert"
  ON families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Parent profile insert: only for the authenticated user's own row.
CREATE POLICY "parent_profiles_insert"
  ON parent_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ─── Auto-init family_settings on family creation ─────────────────────────────
CREATE OR REPLACE FUNCTION init_family_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO family_settings (family_id) VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_family_created'
  ) THEN
    CREATE TRIGGER on_family_created
      AFTER INSERT ON families
      FOR EACH ROW EXECUTE FUNCTION init_family_settings();
  END IF;
END;
$$;
