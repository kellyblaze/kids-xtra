"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function setGoal(childId: string, rewardId: string): Promise<{ error?: string }> {
  try {
    const admin = createAdminClient()
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
