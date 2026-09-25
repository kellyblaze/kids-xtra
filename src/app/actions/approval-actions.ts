"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { awardMilestoneBadges } from "@/lib/badge-service"

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

  const [balanceResult, xpResult, streakResult] = await Promise.all([
    supabase.rpc("recalculate_child_balance", { p_child_id: completion.child_id }),
    supabase.rpc("award_xp", { p_child_id: completion.child_id, p_xp: xpValue }),
    supabase.rpc("update_child_streak", { p_child_id: completion.child_id }),
  ])
  if (balanceResult.error) console.error("recalculate_child_balance failed", balanceResult.error)
  if (xpResult.error) console.error("award_xp failed", xpResult.error)
  if (streakResult.error) console.error("update_child_streak failed", streakResult.error)

  const admin = createAdminClient()
  awardMilestoneBadges(admin, completion.child_id as string, ctx.familyId as string).catch((e) =>
    console.error("awardMilestoneBadges failed", e),
  )

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

  // Atomic RPC: balance check, status update, and debit all happen inside one DB transaction
  const { data: result, error: rpcError } = await supabase.rpc("approve_reward_redemption", {
    p_redemption_id: redemptionId,
    p_family_id: ctx.familyId,
    p_reviewed_by: ctx.userId,
  })

  if (rpcError) return { error: rpcError.message }

  const outcome = result as { error?: string; success?: boolean; reward_title?: string }
  if (outcome?.error) return { error: outcome.error }

  const rewardTitle = outcome?.reward_title ?? "reward"
  const { data: redemption } = await supabase
    .from("reward_redemptions")
    .select("child_id")
    .eq("id", redemptionId)
    .single()

  await supabase.from("activity_logs").insert({
    family_id: ctx.familyId,
    child_id: redemption?.child_id,
    actor_type: "parent",
    actor_id: ctx.userId,
    event_type: "reward_approved",
    metadata: { reward_title: rewardTitle },
  })

  revalidatePath("/parent/approvals")
  revalidatePath("/parent/dashboard")
  return { success: true }
}

export async function approveAllPendingChoreCompletions() {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const { data: pending } = await supabase
    .from("chore_completions")
    .select("id")
    .eq("family_id", ctx.familyId)
    .eq("status", "pending_approval")

  if (!pending?.length) return { success: true, count: 0 }

  const results = await Promise.allSettled(pending.map((c) => approveChoreCompletion(c.id)))
  const succeeded = results.filter((r) => r.status === "fulfilled").length

  revalidatePath("/parent/approvals")
  revalidatePath("/parent/dashboard")
  return { success: true, count: succeeded }
}

export async function deleteChoreCompletion(completionId: string) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const admin = createAdminClient()
  const { error } = await admin
    .from("chore_completions")
    .delete()
    .eq("id", completionId)
    .eq("family_id", ctx.familyId)

  if (error) return { error: error.message }

  revalidatePath("/parent/approvals")
  revalidatePath("/parent/dashboard")
  return { success: true }
}

export async function deleteRewardRedemption(redemptionId: string) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const admin = createAdminClient()
  const { error } = await admin
    .from("reward_redemptions")
    .delete()
    .eq("id", redemptionId)
    .eq("family_id", ctx.familyId)

  if (error) return { error: error.message }

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
