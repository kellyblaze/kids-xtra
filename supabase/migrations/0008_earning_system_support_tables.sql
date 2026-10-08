BEGIN;

-- Tables referenced by the earning-system UI and server actions.
-- This migration is additive only: no existing data is dropped or rewritten.

CREATE TABLE IF NOT EXISTS public.child_goals (
  child_id   uuid PRIMARY KEY REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  family_id  uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  reward_id  uuid NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.child_goals
  ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reward_id uuid REFERENCES public.rewards(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

UPDATE public.child_goals goal
SET family_id = child.family_id
FROM public.child_profiles child
WHERE goal.family_id IS NULL
  AND goal.child_id = child.id;

ALTER TABLE public.child_goals
  ALTER COLUMN family_id SET NOT NULL,
  ALTER COLUMN reward_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.child_goals'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.child_goals ADD CONSTRAINT child_goals_pkey PRIMARY KEY (child_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'child_goals_updated_at'
  ) THEN
    CREATE TRIGGER child_goals_updated_at
      BEFORE UPDATE ON public.child_goals
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS child_goals_family_id_idx
  ON public.child_goals(family_id);
CREATE INDEX IF NOT EXISTS child_goals_reward_id_idx
  ON public.child_goals(reward_id);

CREATE TABLE IF NOT EXISTS public.child_badges (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  child_id   uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  badge_key  text NOT NULL,
  earned_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT child_badges_badge_key_check CHECK (length(trim(badge_key)) > 0),
  CONSTRAINT child_badges_child_badge_key_unique UNIQUE (child_id, badge_key)
);

ALTER TABLE public.child_badges
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS child_id uuid REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS badge_key text,
  ADD COLUMN IF NOT EXISTS earned_at timestamptz NOT NULL DEFAULT now();

UPDATE public.child_badges
SET id = gen_random_uuid()
WHERE id IS NULL;

UPDATE public.child_badges badge
SET family_id = child.family_id
FROM public.child_profiles child
WHERE badge.family_id IS NULL
  AND badge.child_id = child.id;

ALTER TABLE public.child_badges
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN family_id SET NOT NULL,
  ALTER COLUMN child_id SET NOT NULL,
  ALTER COLUMN badge_key SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.child_badges'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.child_badges ADD CONSTRAINT child_badges_pkey PRIMARY KEY (id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'child_badges_child_badge_key_unique'
  ) THEN
    ALTER TABLE public.child_badges
      ADD CONSTRAINT child_badges_child_badge_key_unique UNIQUE (child_id, badge_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS child_badges_family_id_idx
  ON public.child_badges(family_id);
CREATE INDEX IF NOT EXISTS child_badges_child_id_idx
  ON public.child_badges(child_id);
CREATE INDEX IF NOT EXISTS child_badges_earned_at_idx
  ON public.child_badges(earned_at DESC);

CREATE TABLE IF NOT EXISTS public.rejection_reasons (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  reason     text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.parent_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rejection_reasons_reason_check CHECK (length(trim(reason)) BETWEEN 1 AND 160)
);

ALTER TABLE public.rejection_reasons
  ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.parent_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE public.rejection_reasons
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.rejection_reasons
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN family_id SET NOT NULL,
  ALTER COLUMN reason SET NOT NULL,
  ALTER COLUMN is_default SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.rejection_reasons'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.rejection_reasons ADD CONSTRAINT rejection_reasons_pkey PRIMARY KEY (id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS rejection_reasons_family_id_idx
  ON public.rejection_reasons(family_id);
CREATE UNIQUE INDEX IF NOT EXISTS rejection_reasons_family_reason_key
  ON public.rejection_reasons(family_id, lower(trim(reason)));

ALTER TABLE public.child_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_goals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.child_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_badges FORCE ROW LEVEL SECURITY;
ALTER TABLE public.rejection_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejection_reasons FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "child_goals_select" ON public.child_goals;
DROP POLICY IF EXISTS "child_goals_insert" ON public.child_goals;
DROP POLICY IF EXISTS "child_goals_update" ON public.child_goals;
DROP POLICY IF EXISTS "child_goals_delete" ON public.child_goals;
CREATE POLICY "child_goals_select" ON public.child_goals
  FOR SELECT USING (family_id = public.my_family_id());
CREATE POLICY "child_goals_insert" ON public.child_goals
  FOR INSERT WITH CHECK (family_id = public.my_family_id());
CREATE POLICY "child_goals_update" ON public.child_goals
  FOR UPDATE USING (family_id = public.my_family_id())
  WITH CHECK (family_id = public.my_family_id());
CREATE POLICY "child_goals_delete" ON public.child_goals
  FOR DELETE USING (family_id = public.my_family_id());

DROP POLICY IF EXISTS "child_badges_select" ON public.child_badges;
DROP POLICY IF EXISTS "child_badges_insert" ON public.child_badges;
CREATE POLICY "child_badges_select" ON public.child_badges
  FOR SELECT USING (family_id = public.my_family_id());
CREATE POLICY "child_badges_insert" ON public.child_badges
  FOR INSERT WITH CHECK (family_id = public.my_family_id());

DROP POLICY IF EXISTS "rejection_reasons_select" ON public.rejection_reasons;
DROP POLICY IF EXISTS "rejection_reasons_insert" ON public.rejection_reasons;
CREATE POLICY "rejection_reasons_select" ON public.rejection_reasons
  FOR SELECT USING (family_id = public.my_family_id());
CREATE POLICY "rejection_reasons_insert" ON public.rejection_reasons
  FOR INSERT WITH CHECK (family_id = public.my_family_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_goals TO authenticated;
GRANT SELECT, INSERT ON public.child_badges TO authenticated;
GRANT SELECT, INSERT ON public.rejection_reasons TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('child_goals', 'child_badges', 'rejection_reasons')
    GROUP BY table_schema
    HAVING count(*) = 3
  ) THEN
    RAISE EXCEPTION 'Earning system support table verification failed';
  END IF;
END $$;

COMMIT;
