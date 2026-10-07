-- Add a product-level completion state for missions returned to kids.
ALTER TYPE public.completion_status ADD VALUE IF NOT EXISTS 'needs_more_work';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'completion_status'
      AND e.enumlabel = 'needs_more_work'
  ) THEN
    RAISE EXCEPTION 'completion_status needs_more_work verification failed';
  END IF;
END $$;
