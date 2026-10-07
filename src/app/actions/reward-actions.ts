"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { authorizeChildAccess } from "@/lib/kid-authorization"

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

export async function createReward(formData: FormData) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const childIdsRaw = formData.get("child_ids") as string | null
  const childIds = childIdsRaw ? childIdsRaw.split(",").filter(Boolean) : []

  const { data: reward, error } = await supabase
    .from("rewards")
    .insert({
      family_id: ctx.familyId,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      credit_cost: parseInt(formData.get("credit_cost") as string, 10),
      category: (formData.get("category") as string) || null,
      available_to_child_ids: childIds.length > 0 ? childIds : null,
      quantity_available: formData.get("quantity_available")
        ? parseInt(formData.get("quantity_available") as string, 10)
        : null,
      created_by: ctx.userId,
    })
    .select()
    .single()

  if (error || !reward) return { error: error?.message ?? "Failed to create reward" }

  revalidatePath("/parent/rewards")
  revalidatePath("/parent/dashboard")
  return { success: true, rewardId: reward.id }
}

export async function deleteReward(rewardId: string) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("rewards")
    .update({ is_active: false })
    .eq("id", rewardId)
    .eq("family_id", ctx.familyId)

  if (error) return { error: error.message }
  revalidatePath("/parent/rewards")
  return { success: true }
}

export async function awardBonusCredits(childId: string, formData: FormData) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const amount = parseInt((formData.get("amount") as string) || "0", 10)
  const description = ((formData.get("description") as string) || "").trim()

  if (!Number.isInteger(amount) || amount < 1 || amount > 500) {
    return { error: "Bonus Credits must be between 1 and 500." }
  }
  if (description.length < 3 || description.length > 160) {
    return { error: "Add a short reason for the bonus." }
  }

  const { data: child } = await supabase
    .from("child_profiles")
    .select("id, family_id, name")
    .eq("id", childId)
    .eq("family_id", ctx.familyId)
    .eq("is_active", true)
    .single()

  if (!child) return { error: "Child not found" }

  const { error } = await supabase.from("credit_transactions").insert({
    family_id: ctx.familyId,
    child_id: childId,
    type: "bonus",
    amount,
    note: `Bonus: ${description}`,
    created_by: ctx.userId,
  })

  if (error) return { error: error.message }

  const admin = createAdminClient()
  const { error: balanceError } = await admin.rpc("recalculate_child_balance", {
    p_child_id: childId,
  })
  if (balanceError) return { error: "Bonus saved, but balance could not be refreshed." }

  await supabase.from("activity_logs").insert({
    family_id: ctx.familyId,
    child_id: childId,
    actor_type: "parent",
    actor_id: ctx.userId,
    event_type: "bonus_credits_awarded",
    metadata: { child_name: child.name, credits: String(amount), reason: description },
  })

  revalidatePath(`/parent/children/${childId}`)
  revalidatePath("/parent/dashboard")
  revalidatePath(`/kid/${childId}/dashboard`)
  return { success: true }
}

export async function requestRewardRedemption(rewardId: string, childId: string) {
  const authorization = await authorizeChildAccess(childId)
  if (!authorization) return { error: "Not authorized" }

  const supabase = createAdminClient()

  const { data: reward } = await supabase
    .from("rewards")
    .select("id, family_id, credit_cost, quantity_available, quantity_redeemed, is_active, title")
    .eq("id", rewardId)
    .eq("family_id", authorization.familyId)
    .single()

  if (!reward || !reward.is_active) return { error: "Reward not available" }

  if (reward.quantity_available !== null) {
    const remaining = reward.quantity_available - (reward.quantity_redeemed ?? 0)
    if (remaining <= 0) return { error: "Reward is out of stock" }
  }

  const { data: child } = await supabase
    .from("child_profiles")
    .select("credit_balance, family_id")
    .eq("id", childId)
    .eq("family_id", reward.family_id)
    .single()

  if (!child) return { error: "Child not found" }
  if (child.credit_balance < reward.credit_cost) return { error: "Not enough credits" }

  const { error } = await supabase.from("reward_redemptions").insert({
    family_id: reward.family_id,
    child_id: childId,
    reward_id: rewardId,
    credits_spent: reward.credit_cost,
    status: "requested",
  })

  if (error) return { error: error.message }

  await supabase.from("activity_logs").insert({
    family_id: reward.family_id,
    child_id: childId,
    actor_type: "child",
    event_type: "reward_requested",
    metadata: { reward_title: reward.title, credits: String(reward.credit_cost) },
  })

  revalidatePath(`/kid/${childId}/rewards`)
  revalidatePath(`/kid/${childId}/dashboard`)
  return { success: true }
}
