BEGIN;

ALTER TABLE public.chores
  ADD COLUMN IF NOT EXISTS checklist_items text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.chore_completions
  ADD COLUMN IF NOT EXISTS checklist_completed text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chores'
      AND column_name = 'checklist_items'
  ) THEN
    RAISE EXCEPTION 'chores.checklist_items verification failed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chore_completions'
      AND column_name = 'checklist_completed'
  ) THEN
    RAISE EXCEPTION 'chore_completions.checklist_completed verification failed';
  END IF;
END $$;

COMMIT;
