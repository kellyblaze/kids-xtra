// ─── Enums ────────────────────────────────────────────────────────────────────

export type TaskCategory =
  | 'chore'
  | 'morning_routine'
  | 'bedtime_routine'
  | 'kindness'
  | 'learning'
  | 'health_hygiene'
  | 'bonus_mission'

export type TaskFrequency = 'one_time' | 'daily' | 'weekly' | 'custom'

export type CompletionStatus = 'pending_approval' | 'approved' | 'rejected'

export type RedemptionStatus =
  | 'requested'
  | 'approved'
  | 'denied'
  | 'fulfilled'
  | 'cancelled'

export type CreditTxType =
  | 'chore_approved'
  | 'reward_redeemed'
  | 'manual_adjustment'
  | 'bonus'
  | 'allowance_conversion'
  | 'family_goal_contribution'

export type MemberRole = 'primary_parent' | 'co_parent' | 'helper' | 'grandparent'

// ─── Database Row Types ───────────────────────────────────────────────────────

export interface Family {
  id: string
  name: string
  created_at: string
  settings: Record<string, unknown>
}

export interface ParentProfile {
  id: string
  family_id: string
  role: MemberRole
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export interface ChildProfile {
  id: string
  family_id: string
  name: string
  nickname: string | null
  avatar_key: string | null
  color_theme: string | null
  pin_hash: string | null
  credit_balance: number
  xp_total: number
  level: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Chore {
  id: string
  family_id: string
  title: string
  description: string | null
  category: TaskCategory
  frequency: TaskFrequency
  custom_days: number[] | null
  times_per_period: number
  period_unit: 'day' | 'week' | 'month'
  due_time: string | null
  credit_value: number
  xp_value: number
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface ChoreAssignment {
  id: string
  chore_id: string
  child_id: string
  family_id: string
  assigned_at: string
  assigned_by: string
}

export interface ChoreCompletion {
  id: string
  assignment_id: string
  child_id: string
  family_id: string
  status: CompletionStatus
  completed_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  rejection_note: string | null
  due_date: string | null
  credits_awarded: number
  xp_awarded: number
}

export interface CreditTransaction {
  id: string
  family_id: string
  child_id: string
  type: CreditTxType
  amount: number
  reference_id: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

export interface Reward {
  id: string
  family_id: string
  title: string
  description: string | null
  credit_cost: number
  category: string | null
  image_url: string | null
  is_active: boolean
  quantity_limit: number | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface RewardRedemption {
  id: string
  reward_id: string
  child_id: string
  family_id: string
  status: RedemptionStatus
  requested_at: string
  reviewed_at: string | null
  reviewed_by: string | null
  denial_note: string | null
  credits_spent: number
}

export interface ActivityLog {
  id: string
  family_id: string
  child_id: string | null
  actor_type: 'parent' | 'child'
  actor_id: string | null
  event_type: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface FamilySettings {
  family_id: string
  allow_negative_balance: boolean
  gamification_enabled: boolean
  streaks_enabled: boolean
  xp_enabled: boolean
  allowance_mode: 'credits_only' | 'convert' | 'mixed'
  credits_per_dollar: number | null
  updated_at: string
}

// ─── Joined / Enriched Types ─────────────────────────────────────────────────

export interface ChoreWithAssignments extends Chore {
  chore_assignments: (ChoreAssignment & {
    child_profiles: Pick<ChildProfile, 'id' | 'name' | 'avatar_key' | 'color_theme'>
  })[]
}

export interface CompletionWithDetails extends ChoreCompletion {
  chore_assignments: ChoreAssignment & {
    chores: Pick<Chore, 'id' | 'title' | 'category' | 'credit_value'>
    child_profiles: Pick<ChildProfile, 'id' | 'name' | 'avatar_key' | 'color_theme'>
  }
}

export interface RedemptionWithDetails extends RewardRedemption {
  rewards: Pick<Reward, 'id' | 'title' | 'description' | 'credit_cost'>
  child_profiles: Pick<ChildProfile, 'id' | 'name' | 'avatar_key' | 'color_theme'>
}
