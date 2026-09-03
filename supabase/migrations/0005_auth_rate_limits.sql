BEGIN;

CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  bucket_key text PRIMARY KEY,
  attempt_count integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auth_rate_limits_attempt_count_check CHECK (attempt_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_auth_rate_limits_updated_at
  ON public.auth_rate_limits (updated_at);

ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_rate_limits FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.auth_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_auth_rate_limit(
  p_bucket_key text,
  p_max_attempts integer,
  p_window_seconds integer,
  p_block_seconds integer
)
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_bucket public.auth_rate_limits%ROWTYPE;
BEGIN
  IF p_bucket_key IS NULL OR length(p_bucket_key) < 32
    OR p_max_attempts < 1
    OR p_window_seconds < 1
    OR p_block_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate-limit parameters';
  END IF;

  DELETE FROM public.auth_rate_limits
    WHERE updated_at < v_now - interval '30 days';

  INSERT INTO public.auth_rate_limits AS limits (
    bucket_key,
    attempt_count,
    window_started_at,
    blocked_until,
    updated_at
  )
  VALUES (p_bucket_key, 1, v_now, NULL, v_now)
  ON CONFLICT (bucket_key) DO UPDATE
  SET
    attempt_count = CASE
      WHEN limits.blocked_until > v_now THEN limits.attempt_count
      WHEN limits.window_started_at <= v_now - make_interval(secs => p_window_seconds) THEN 1
      ELSE limits.attempt_count + 1
    END,
    window_started_at = CASE
      WHEN limits.blocked_until <= v_now
        OR limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
      THEN v_now
      ELSE limits.window_started_at
    END,
    blocked_until = CASE
      WHEN limits.blocked_until > v_now THEN limits.blocked_until
      WHEN limits.window_started_at <= v_now - make_interval(secs => p_window_seconds) THEN NULL
      WHEN limits.attempt_count + 1 > p_max_attempts THEN v_now + make_interval(secs => p_block_seconds)
      ELSE NULL
    END,
    updated_at = v_now
  RETURNING limits.* INTO v_bucket;

  allowed := v_bucket.blocked_until IS NULL AND v_bucket.attempt_count <= p_max_attempts;
  retry_after_seconds := CASE
    WHEN allowed THEN 0
    ELSE greatest(1, ceil(extract(epoch FROM (v_bucket.blocked_until - v_now)))::integer)
  END;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_auth_rate_limit(text, integer, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_auth_rate_limit(text, integer, integer, integer)
  TO service_role;

COMMIT;
