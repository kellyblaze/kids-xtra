"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { TaskCategory, TaskFrequency } from "@/types/database"

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

export async function createChore(formData: FormData) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const childIds = formData.getAll("child_ids") as string[]
  const customDaysRaw = formData.get("custom_days") as string | null
  const customDays = customDaysRaw
    ? customDaysRaw.split(",").map(Number).filter((n) => !isNaN(n))
    : null

  const { data: chore, error } = await supabase
    .from("chores")
    .insert({
      family_id: ctx.familyId,
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      category: formData.get("category") as TaskCategory,
      frequency: formData.get("frequency") as TaskFrequency,
      custom_days: customDays,
      due_time: (formData.get("due_time") as string) || null,
      credit_value: parseInt(formData.get("credit_value") as string, 10),
      xp_value: parseInt((formData.get("xp_value") as string) || "0", 10),
      created_by: ctx.userId,
    })
    .select()
    .single()

  if (error || !chore) return { error: error?.message ?? "Failed to create chore" }

  if (childIds.length > 0) {
    const { error: assignError } = await supabase.from("chore_assignments").insert(
      childIds.map((childId) => ({
        chore_id: chore.id,
        child_id: childId,
        family_id: ctx.familyId,
        assigned_by: ctx.userId,
      }))
    )
    if (assignError) return { error: assignError.message }
  }

  await supabase.from("activity_logs").insert({
    family_id: ctx.familyId,
    actor_type: "parent",
    actor_id: ctx.userId,
    event_type: "chore_created",
    metadata: { chore_title: chore.title, chore_id: chore.id },
  })

  revalidatePath("/parent/chores")
  revalidatePath("/parent/dashboard")
  return { success: true, choreId: chore.id }
}

export async function updateChore(choreId: string, formData: FormData) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const customDaysRaw = formData.get("custom_days") as string | null
  const customDays = customDaysRaw
    ? customDaysRaw.split(",").map(Number).filter((n) => !isNaN(n))
    : null

  const { error } = await supabase
    .from("chores")
    .update({
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || null,
      category: formData.get("category") as TaskCategory,
      frequency: formData.get("frequency") as TaskFrequency,
      custom_days: customDays,
      due_time: (formData.get("due_time") as string) || null,
      credit_value: parseInt(formData.get("credit_value") as string, 10),
      is_active: formData.get("is_active") === "true",
    })
    .eq("id", choreId)
    .eq("family_id", ctx.familyId)

  if (error) return { error: error.message }
  revalidatePath("/parent/chores")
  return { success: true }
}

export async function deleteChore(choreId: string) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("chores")
    .update({ is_active: false })
    .eq("id", choreId)
    .eq("family_id", ctx.familyId)

  if (error) return { error: error.message }
  revalidatePath("/parent/chores")
  return { success: true }
}

export async function updateChoreAssignments(choreId: string, childIds: string[]) {
  const supabase = await createClient()
  const ctx = await getParentContext(supabase)
  if (!ctx) return { error: "Not authenticated" }

  await supabase
    .from("chore_assignments")
    .delete()
    .eq("chore_id", choreId)
    .eq("family_id", ctx.familyId)

  if (childIds.length > 0) {
    const { error } = await supabase.from("chore_assignments").insert(
      childIds.map((childId) => ({
        chore_id: choreId,
        child_id: childId,
        family_id: ctx.familyId,
        assigned_by: ctx.userId,
      }))
    )
    if (error) return { error: error.message }
  }

  revalidatePath("/parent/chores")
  return { success: true }
}
