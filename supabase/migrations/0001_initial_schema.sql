-- ============================================================
-- Kids Xtra - Phase 1 Initial Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE task_category AS ENUM (
  'chore','morning_routine','bedtime_routine',
  'kindness','learning','health_hygiene','bonus_mission'
);

CREATE TYPE task_frequency AS ENUM (
  'one_time','daily','weekly','custom'
);

CREATE TYPE completion_status AS ENUM (
  'pending_approval','approved','rejected'
);

CREATE TYPE redemption_status AS ENUM (
  'requested','approved','denied','fulfilled','cancelled'
);

CREATE TYPE credit_tx_type AS ENUM (
  'chore_approved','reward_redeemed','manual_adjustment',
  'bonus','allowance_conversion','family_goal_contribution'
);

CREATE TYPE member_role AS ENUM (
  'primary_parent','co_parent','helper','grandparent'
);

-- ─── Families ────────────────────────────────────────────────────────────────

CREATE TABLE families (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  settings   jsonb NOT NULL DEFAULT '{}'
);

-- ─── Parent Profiles ─────────────────────────────────────────────────────────

CREATE TABLE parent_profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  role         member_role NOT NULL DEFAULT 'primary_parent',
  display_name text,
  avatar_url   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX parent_profiles_family_id_idx ON parent_profiles(family_id);

-- ─── Child Profiles ───────────────────────────────────────────────────────────

CREATE TABLE child_profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id      uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name           text NOT NULL,
  nickname       text,
  avatar_key     text,
  color_theme    text DEFAULT 'purple',
  pin_hash       text,
  credit_balance integer NOT NULL DEFAULT 0,
  xp_total       integer NOT NULL DEFAULT 0,
  level          integer NOT NULL DEFAULT 1,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX child_profiles_family_id_idx ON child_profiles(family_id);

-- ─── Chores ───────────────────────────────────────────────────────────────────

CREATE TABLE chores (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title        text NOT NULL,
  description  text,
  category     task_category NOT NULL DEFAULT 'chore',
  frequency    task_frequency NOT NULL DEFAULT 'one_time',
  custom_days  integer[],
  due_time     time,
  credit_value integer NOT NULL DEFAULT 5 CHECK (credit_value >= 0),
  xp_value     integer NOT NULL DEFAULT 0,
  is_active    boolean NOT NULL DEFAULT true,
  created_by   uuid NOT NULL REFERENCES parent_profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chores_family_id_idx ON chores(family_id);

-- ─── Chore Assignments ────────────────────────────────────────────────────────

CREATE TABLE chore_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chore_id    uuid NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  child_id    uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  family_id   uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid NOT NULL REFERENCES parent_profiles(id),
  UNIQUE (chore_id, child_id)
);

CREATE INDEX chore_assignments_child_id_idx ON chore_assignments(child_id);
CREATE INDEX chore_assignments_family_id_idx ON chore_assignments(family_id);

-- ─── Chore Completions ────────────────────────────────────────────────────────

CREATE TABLE chore_completions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id  uuid NOT NULL REFERENCES chore_assignments(id) ON DELETE CASCADE,
  child_id       uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  family_id      uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  status         completion_status NOT NULL DEFAULT 'pending_approval',
  completed_at   timestamptz NOT NULL DEFAULT now(),
  reviewed_at    timestamptz,
  reviewed_by    uuid REFERENCES parent_profiles(id),
  rejection_note text,
  due_date       date,
  credits_awarded integer NOT NULL DEFAULT 0,
  xp_awarded      integer NOT NULL DEFAULT 0
);

CREATE INDEX chore_completions_child_id_idx ON chore_completions(child_id);
CREATE INDEX chore_completions_family_id_idx ON chore_completions(family_id);
CREATE INDEX chore_completions_status_idx ON chore_completions(status);

-- ─── Credit Transactions ─────────────────────────────────────────────────────

CREATE TABLE credit_transactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id    uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id     uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  type         credit_tx_type NOT NULL,
  amount       integer NOT NULL,
  reference_id uuid,
  note         text,
  created_by   uuid REFERENCES parent_profiles(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX credit_transactions_child_id_idx ON credit_transactions(child_id);
CREATE INDEX credit_transactions_family_id_idx ON credit_transactions(family_id);
CREATE INDEX credit_transactions_created_at_idx ON credit_transactions(created_at DESC);

-- ─── Rewards ─────────────────────────────────────────────────────────────────

CREATE TABLE rewards (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id      uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title          text NOT NULL,
  description    text,
  credit_cost    integer NOT NULL CHECK (credit_cost >= 0),
  category       text,
  image_url      text,
  is_active      boolean NOT NULL DEFAULT true,
  quantity_limit integer,
  created_by     uuid NOT NULL REFERENCES parent_profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rewards_family_id_idx ON rewards(family_id);

-- ─── Reward Redemptions ──────────────────────────────────────────────────────

CREATE TABLE reward_redemptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_id     uuid NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  child_id      uuid NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  family_id     uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  status        redemption_status NOT NULL DEFAULT 'requested',
  requested_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_at   timestamptz,
  reviewed_by   uuid REFERENCES parent_profiles(id),
  denial_note   text,
  credits_spent integer NOT NULL CHECK (credits_spent >= 0)
);

CREATE INDEX reward_redemptions_child_id_idx ON reward_redemptions(child_id);
CREATE INDEX reward_redemptions_family_id_idx ON reward_redemptions(family_id);
CREATE INDEX reward_redemptions_status_idx ON reward_redemptions(status);

-- ─── Activity Logs ────────────────────────────────────────────────────────────

CREATE TABLE activity_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id  uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  child_id   uuid REFERENCES child_profiles(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('parent', 'child')),
  actor_id   uuid,
  event_type text NOT NULL,
  metadata   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_logs_family_id_idx ON activity_logs(family_id);
CREATE INDEX activity_logs_created_at_idx ON activity_logs(created_at DESC);

-- ─── Family Settings ─────────────────────────────────────────────────────────

CREATE TABLE family_settings (
  family_id              uuid PRIMARY KEY REFERENCES families(id) ON DELETE CASCADE,
  allow_negative_balance boolean NOT NULL DEFAULT false,
  gamification_enabled   boolean NOT NULL DEFAULT true,
  streaks_enabled        boolean NOT NULL DEFAULT true,
  xp_enabled             boolean NOT NULL DEFAULT true,
  allowance_mode         text NOT NULL DEFAULT 'credits_only'
                         CHECK (allowance_mode IN ('credits_only','convert','mixed')),
  credits_per_dollar     numeric,
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- ─── Functions & Triggers ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION recalculate_child_balance(p_child_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_balance integer;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM credit_transactions WHERE child_id = p_child_id;
  UPDATE child_profiles SET credit_balance = v_balance, updated_at = now()
  WHERE id = p_child_id;
  RETURN v_balance;
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER child_profiles_updated_at
  BEFORE UPDATE ON child_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER rewards_updated_at
  BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER chores_updated_at
  BEFORE UPDATE ON chores FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_settings ENABLE ROW LEVEL SECURITY;

-- Helper: returns family_id for the authenticated parent
CREATE OR REPLACE FUNCTION my_family_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT family_id FROM parent_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- families
CREATE POLICY "families_select" ON families FOR SELECT USING (id = my_family_id());
CREATE POLICY "families_update" ON families FOR UPDATE USING (id = my_family_id());

-- parent_profiles
CREATE POLICY "parent_profiles_select" ON parent_profiles FOR SELECT USING (family_id = my_family_id());
CREATE POLICY "parent_profiles_update" ON parent_profiles FOR UPDATE USING (id = auth.uid());

-- child_profiles
CREATE POLICY "child_profiles_select" ON child_profiles FOR SELECT USING (family_id = my_family_id());
CREATE POLICY "child_profiles_insert" ON child_profiles FOR INSERT WITH CHECK (family_id = my_family_id());
CREATE POLICY "child_profiles_update" ON child_profiles FOR UPDATE USING (family_id = my_family_id());
CREATE POLICY "child_profiles_delete" ON child_profiles FOR DELETE USING (family_id = my_family_id());

-- chores
CREATE POLICY "chores_select" ON chores FOR SELECT USING (family_id = my_family_id());
CREATE POLICY "chores_insert" ON chores FOR INSERT WITH CHECK (family_id = my_family_id());
CREATE POLICY "chores_update" ON chores FOR UPDATE USING (family_id = my_family_id());
CREATE POLICY "chores_delete" ON chores FOR DELETE USING (family_id = my_family_id());

-- chore_assignments
CREATE POLICY "chore_assignments_select" ON chore_assignments FOR SELECT USING (family_id = my_family_id());
CREATE POLICY "chore_assignments_insert" ON chore_assignments FOR INSERT WITH CHECK (family_id = my_family_id());
CREATE POLICY "chore_assignments_delete" ON chore_assignments FOR DELETE USING (family_id = my_family_id());

-- chore_completions
CREATE POLICY "chore_completions_select" ON chore_completions FOR SELECT USING (family_id = my_family_id());
CREATE POLICY "chore_completions_insert" ON chore_completions FOR INSERT WITH CHECK (family_id = my_family_id());
CREATE POLICY "chore_completions_update" ON chore_completions FOR UPDATE USING (family_id = my_family_id());

-- credit_transactions
CREATE POLICY "credit_transactions_select" ON credit_transactions FOR SELECT USING (family_id = my_family_id());
CREATE POLICY "credit_transactions_insert" ON credit_transactions FOR INSERT WITH CHECK (family_id = my_family_id());

-- rewards
CREATE POLICY "rewards_select" ON rewards FOR SELECT USING (family_id = my_family_id());
CREATE POLICY "rewards_insert" ON rewards FOR INSERT WITH CHECK (family_id = my_family_id());
CREATE POLICY "rewards_update" ON rewards FOR UPDATE USING (family_id = my_family_id());
CREATE POLICY "rewards_delete" ON rewards FOR DELETE USING (family_id = my_family_id());

-- reward_redemptions
CREATE POLICY "reward_redemptions_select" ON reward_redemptions FOR SELECT USING (family_id = my_family_id());
CREATE POLICY "reward_redemptions_insert" ON reward_redemptions FOR INSERT WITH CHECK (family_id = my_family_id());
CREATE POLICY "reward_redemptions_update" ON reward_redemptions FOR UPDATE USING (family_id = my_family_id());

-- activity_logs
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT USING (family_id = my_family_id());
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT WITH CHECK (family_id = my_family_id());

-- family_settings
CREATE POLICY "family_settings_select" ON family_settings FOR SELECT USING (family_id = my_family_id());
CREATE POLICY "family_settings_insert" ON family_settings FOR INSERT WITH CHECK (family_id = my_family_id());
CREATE POLICY "family_settings_update" ON family_settings FOR UPDATE USING (family_id = my_family_id());
