BEGIN;

-- Family membership and subscription state are server-managed. RLS alone limits
-- rows, not columns, so direct authenticated writes could otherwise alter
-- billing entitlements or move a parent into another family.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.families FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.parent_profiles FROM PUBLIC, anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.families TO service_role;
GRANT INSERT, UPDATE, DELETE ON TABLE public.parent_profiles TO service_role;

-- These routines intentionally bypass RLS after the application has completed
-- its parent/family authorization checks. Fully qualify every object and allow
-- execution only through the server-side service role.
CREATE OR REPLACE FUNCTION public.recalculate_child_balance(p_child_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_balance integer;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM public.credit_transactions
  WHERE child_id = p_child_id;

  UPDATE public.child_profiles
  SET credit_balance = v_balance, updated_at = now()
  WHERE id = p_child_id;

  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_child_streak(p_child_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_today date := current_date;
  v_last_date date;
  v_current integer;
  v_longest integer;
  v_family_id uuid;
BEGIN
  SELECT family_id INTO v_family_id
  FROM public.child_profiles
  WHERE id = p_child_id;

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
    RETURN;
  ELSIF v_last_date = v_today - 1 THEN
    v_current := v_current + 1;
  ELSE
    v_current := 1;
  END IF;

  v_longest := GREATEST(v_longest, v_current);

  UPDATE public.child_streaks
  SET current_streak = v_current,
      longest_streak = v_longest,
      last_completion_date = v_today,
      updated_at = now()
  WHERE child_id = p_child_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_xp(p_child_id uuid, p_xp integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_new_xp integer;
  v_new_level integer;
BEGIN
  UPDATE public.child_profiles
  SET xp_total = xp_total + p_xp,
      updated_at = now()
  WHERE id = p_child_id
  RETURNING xp_total INTO v_new_xp;

  v_new_level := public.calculate_level(v_new_xp);

  UPDATE public.child_profiles
  SET level = v_new_level
  WHERE id = p_child_id AND level <> v_new_level;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_reward_redemption(
  p_redemption_id uuid,
  p_family_id uuid,
  p_reviewed_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_redemption public.reward_redemptions%ROWTYPE;
  v_balance numeric;
  v_allow_neg boolean;
  v_reward_title text;
BEGIN
  SELECT * INTO v_redemption
  FROM public.reward_redemptions
  WHERE id = p_redemption_id AND family_id = p_family_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Redemption not found');
  END IF;
  IF v_redemption.status <> 'requested' THEN
    RETURN jsonb_build_object('error', 'Already reviewed');
  END IF;

  SELECT credit_balance INTO v_balance
  FROM public.child_profiles
  WHERE id = v_redemption.child_id
  FOR UPDATE;

  SELECT COALESCE(allow_negative_balance, false) INTO v_allow_neg
  FROM public.family_settings
  WHERE family_id = p_family_id;

  IF NOT v_allow_neg AND v_balance < v_redemption.credits_spent THEN
    RETURN jsonb_build_object('error', 'Child does not have enough credits');
  END IF;

  SELECT title INTO v_reward_title
  FROM public.rewards
  WHERE id = v_redemption.reward_id;

  UPDATE public.reward_redemptions
  SET status = 'approved', reviewed_at = now(), reviewed_by = p_reviewed_by
  WHERE id = p_redemption_id;

  INSERT INTO public.credit_transactions
    (family_id, child_id, type, amount, reference_id, note, created_by)
  VALUES
    (p_family_id, v_redemption.child_id, 'reward_redeemed',
     -v_redemption.credits_spent, p_redemption_id,
     'Redeemed: ' || COALESCE(v_reward_title, 'reward'), p_reviewed_by);

  PERFORM public.recalculate_child_balance(v_redemption.child_id);
  RETURN jsonb_build_object(
    'success', true,
    'reward_title', COALESCE(v_reward_title, 'reward')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.recalculate_child_balance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_child_streak(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.award_xp(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_reward_redemption(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_child_balance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_child_streak(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_reward_redemption(uuid, uuid, uuid) TO service_role;

-- Lock the helper functions used by policies/triggers to known schemas.
ALTER FUNCTION public.my_family_id() SET search_path = 'pg_catalog', 'public';
ALTER FUNCTION public.init_family_settings() SET search_path = 'pg_catalog', 'public';
REVOKE ALL ON FUNCTION public.init_family_settings() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF has_table_privilege('authenticated', 'public.families', 'INSERT')
     OR has_table_privilege('authenticated', 'public.families', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.families', 'DELETE') THEN
    RAISE EXCEPTION 'families write privileges remain available to authenticated';
  END IF;

  IF has_table_privilege('authenticated', 'public.parent_profiles', 'INSERT')
     OR has_table_privilege('authenticated', 'public.parent_profiles', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.parent_profiles', 'DELETE') THEN
    RAISE EXCEPTION 'parent_profiles write privileges remain available to authenticated';
  END IF;

  IF has_function_privilege('authenticated', 'public.recalculate_child_balance(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.update_child_streak(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.award_xp(uuid,integer)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.approve_reward_redemption(uuid,uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'privileged function execution remains available to authenticated';
  END IF;
END;
$$;

COMMIT;
