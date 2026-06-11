-- ─── Streaks & XP ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.child_streaks (
  child_id              uuid PRIMARY KEY REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  family_id             uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  current_streak        integer NOT NULL DEFAULT 0,
  longest_streak        integer NOT NULL DEFAULT 0,
  last_completion_date  date,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.child_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "child_streaks_select"
  ON public.child_streaks FOR SELECT
  USING (family_id = my_family_id());

CREATE POLICY "child_streaks_insert"
  ON public.child_streaks FOR INSERT
  WITH CHECK (family_id = my_family_id());

CREATE POLICY "child_streaks_update"
  ON public.child_streaks FOR UPDATE
  USING (family_id = my_family_id());

-- ─── RPC: update_child_streak ─────────────────────────────────────────────────
-- Increments streak if last completion was yesterday; resets to 1 otherwise.
-- Called after every chore approval.
CREATE OR REPLACE FUNCTION public.update_child_streak(p_child_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today     date := current_date;
  v_last_date date;
  v_current   integer;
  v_longest   integer;
  v_family_id uuid;
BEGIN
  SELECT family_id INTO v_family_id
    FROM public.child_profiles WHERE id = p_child_id;

  SELECT last_completion_date, current_streak, longest_streak
    INTO v_last_date, v_current, v_longest
    FROM public.child_streaks
   WHERE child_id = p_child_id;

  IF NOT FOUND THEN
    INSERT INTO public.child_streaks
      (child_id, family_id, current_streak, longest_streak, last_completion_date)
    VALUES (p_child_id, v_family_id, 1, 1, v_today);
    RETURN;
  END IF;

  IF v_last_date = v_today THEN
    RETURN;  -- already updated today
  ELSIF v_last_date = v_today - 1 THEN
    v_current := v_current + 1;
  ELSE
    v_current := 1;
  END IF;

  v_longest := GREATEST(v_longest, v_current);

  UPDATE public.child_streaks
     SET current_streak       = v_current,
         longest_streak       = v_longest,
         last_completion_date = v_today,
         updated_at           = now()
   WHERE child_id = p_child_id;
END;
$$;

-- ─── RPC: calculate_level ─────────────────────────────────────────────────────
-- Level N requires floor(sqrt(xp/50)) + 1. Level 1 = 0 XP, Level 5 ≈ 1250 XP.
CREATE OR REPLACE FUNCTION public.calculate_level(p_xp integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(1, FLOOR(SQRT(GREATEST(p_xp, 0)::float / 50))::integer + 1);
$$;

-- ─── RPC: award_xp ────────────────────────────────────────────────────────────
-- Adds XP to a child and recalculates their level in one atomic update.
CREATE OR REPLACE FUNCTION public.award_xp(p_child_id uuid, p_xp integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_xp    integer;
  v_new_level integer;
BEGIN
  UPDATE public.child_profiles
     SET xp_total   = xp_total + p_xp,
         updated_at = now()
   WHERE id = p_child_id
   RETURNING xp_total INTO v_new_xp;

  v_new_level := public.calculate_level(v_new_xp);

  UPDATE public.child_profiles
     SET level = v_new_level
   WHERE id = p_child_id AND level <> v_new_level;
END;
$$;
