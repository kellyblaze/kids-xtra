"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { authorizeChildAccess } from "@/lib/kid-authorization"

export async function setGoal(childId: string, rewardId: string): Promise<{ error?: string }> {
  try {
    const authorization = await authorizeChildAccess(childId)
    if (!authorization) return { error: "Not authorized" }

    const admin = createAdminClient()
    const { data: reward } = await admin
      .from("rewards")
      .select("id, available_to_child_ids")
      .eq("id", rewardId)
      .eq("family_id", authorization.familyId)
      .eq("is_active", true)
      .maybeSingle()
    if (!reward) return { error: "Reward not available" }
    if (reward.available_to_child_ids && !reward.available_to_child_ids.includes(childId)) {
      return { error: "Reward not available" }
    }

    const { error } = await admin
      .from("child_goals")
      .upsert({ child_id: childId, reward_id: rewardId }, { onConflict: "child_id" })
    if (error) return { error: error.message }
    revalidatePath(`/kid/${childId}/rewards`)
    revalidatePath(`/kid/${childId}/dashboard`)
    return {}
  } catch {
    return { error: "Could not save goal." }
  }
}

export async function clearGoal(childId: string): Promise<{ error?: string }> {
  try {
    if (!await authorizeChildAccess(childId)) return { error: "Not authorized" }

    const admin = createAdminClient()
    const { error } = await admin.from("child_goals").delete().eq("child_id", childId)
    if (error) return { error: error.message }
    revalidatePath(`/kid/${childId}/rewards`)
    revalidatePath(`/kid/${childId}/dashboard`)
    return {}
  } catch {
    return { error: "Could not clear goal." }
  }
}
