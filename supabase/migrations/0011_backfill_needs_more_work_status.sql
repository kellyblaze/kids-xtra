-- Backfill historical rejected Mission Checks after the enum value exists.
UPDATE public.chore_completions
SET status = 'needs_more_work'
WHERE status = 'rejected';
