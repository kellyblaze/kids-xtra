"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

async function getParentContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return null
  return { userId: user.id, familyId: profile.family_id }
}

export async function approveChoreCompletion(completionId: string) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const { data: completion, error: fetchError } = await supabase
    .from("chore_completions")
    .select(`id, child_id, family_id, status,
      chore_assignments(chores(credit_value, title, xp_value))`)
    .eq("id", completionId)
    .eq("family_id", ctx.familyId)
    .single()

  if (fetchError || !completion) return { error: "Completion not found" }
  if (completion.status !== "pending_approval") return { error: "Already reviewed" }

  const assignment = (() => {
    const raw = completion.chore_assignments
    if (!raw) return null
    return Array.isArray(raw) ? raw[0] ?? null : raw
  })()
  const chores = assignment?.chores
  const chore = chores ? (Array.isArray(chores) ? chores[0] ?? null : chores) : null
  const creditValue = chore?.credit_value ?? 0
  const xpValue = chore?.xp_value ?? 0
  const choreTitle = chore?.title ?? "chore"

  const { error: updateError } = await supabase
    .from("chore_completions")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: ctx.userId,
      credits_awarded: creditValue,
      xp_awarded: xpValue,
    })
    .eq("id", completionId)

  if (updateError) return { error: updateError.message }

  await supabase.from("credit_transactions").insert({
    family_id: ctx.familyId,
    child_id: completion.child_id,
    type: "chore_approved",
    amount: creditValue,
    reference_id: completionId,
    note: `Earned for: ${choreTitle}`,
    created_by: ctx.userId,
  })

  await supabase.rpc("recalculate_child_balance", { p_child_id: completion.child_id })
  await supabase.rpc("award_xp", { p_child_id: completion.child_id, p_xp: xpValue })
  await supabase.rpc("update_child_streak", { p_child_id: completion.child_id })

  await supabase.from("activity_logs").insert({
    family_id: ctx.familyId,
    child_id: completion.child_id,
    actor_type: "parent",
    actor_id: ctx.userId,
    event_type: "chore_approved",
    metadata: { chore_title: choreTitle, credits: String(creditValue), completion_id: completionId },
  })

  revalidatePath("/parent/approvals")
  revalidatePath("/parent/dashboard")
  revalidatePath(`/kid/${completion.child_id}/dashboard`)
  return { success: true }
}

export async function rejectChoreCompletion(completionId: string, rejectionNote: string) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const { data: completion } = await supabase
    .from("chore_completions")
    .select("id, child_id, family_id, status")
    .eq("id", completionId)
    .eq("family_id", ctx.familyId)
    .single()

  if (!completion || completion.status !== "pending_approval") return { error: "Not found or already reviewed" }

  const { error } = await supabase
    .from("chore_completions")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: ctx.userId,
      rejection_note: rejectionNote || null,
    })
    .eq("id", completionId)

  if (error) return { error: error.message }

  await supabase.from("activity_logs").insert({
    family_id: ctx.familyId,
    child_id: completion.child_id,
    actor_type: "parent",
    actor_id: ctx.userId,
    event_type: "chore_rejected",
    metadata: { completion_id: completionId, note: rejectionNote },
  })

  revalidatePath("/parent/approvals")
  revalidatePath("/parent/dashboard")
  return { success: true }
}

export async function approveRewardRedemption(redemptionId: string) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const { data: redemption, error: fetchError } = await supabase
    .from("reward_redemptions")
    .select("id, child_id, family_id, status, credits_spent, rewards(title)")
    .eq("id", redemptionId)
    .eq("family_id", ctx.familyId)
    .single()

  if (fetchError || !redemption) return { error: "Redemption not found" }
  if (redemption.status !== "requested") return { error: "Already reviewed" }

  const { data: child } = await supabase
    .from("child_profiles")
    .select("credit_balance")
    .eq("id", redemption.child_id)
    .single()

  const { data: settings } = await supabase
    .from("family_settings")
    .select("allow_negative_balance")
    .eq("family_id", ctx.familyId)
    .single()

  if (!(settings?.allow_negative_balance ?? false) && (child?.credit_balance ?? 0) < redemption.credits_spent) {
    return { error: "Child does not have enough credits" }
  }

  const reward = (() => {
    const raw = redemption.rewards
    if (!raw) return null
    return Array.isArray(raw) ? raw[0] ?? null : raw
  })()
  const rewardTitle = reward?.title ?? "reward"

  const { error } = await supabase
    .from("reward_redemptions")
    .update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: ctx.userId })
    .eq("id", redemptionId)

  if (error) return { error: error.message }

  await supabase.from("credit_transactions").insert({
    family_id: ctx.familyId,
    child_id: redemption.child_id,
    type: "reward_redeemed",
    amount: -redemption.credits_spent,
    reference_id: redemptionId,
    note: `Redeemed: ${rewardTitle}`,
    created_by: ctx.userId,
  })

  await supabase.rpc("recalculate_child_balance", { p_child_id: redemption.child_id })

  await supabase.from("activity_logs").insert({
    family_id: ctx.familyId,
    child_id: redemption.child_id,
    actor_type: "parent",
    actor_id: ctx.userId,
    event_type: "reward_approved",
    metadata: { reward_title: rewardTitle, credits: String(redemption.credits_spent) },
  })

  revalidatePath("/parent/approvals")
  revalidatePath("/parent/dashboard")
  return { success: true }
}

export async function denyRewardRedemption(redemptionId: string, denialNote: string) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const { data: redemption } = await supabase
    .from("reward_redemptions")
    .select("child_id, family_id, status")
    .eq("id", redemptionId)
    .eq("family_id", ctx.familyId)
    .single()

  if (!redemption || redemption.status !== "requested") return { error: "Not found or already reviewed" }

  const { error } = await supabase
    .from("reward_redemptions")
    .update({
      status: "denied",
      reviewed_at: new Date().toISOString(),
      reviewed_by: ctx.userId,
      denial_note: denialNote || null,
    })
    .eq("id", redemptionId)

  if (error) return { error: error.message }

  revalidatePath("/parent/approvals")
  revalidatePath("/parent/dashboard")
  return { success: true }
}
