"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { authorizeChildAccess } from "@/lib/kid-authorization"
import { revalidatePath } from "next/cache"

export async function markChoreComplete(assignmentId: string, childId: string, photoUrl?: string) {
  const authorization = await authorizeChildAccess(childId)
  if (!authorization) return { error: "Not authorized" }

  const supabase = createAdminClient()

  const { data: assignment } = await supabase
    .from("chore_assignments")
    .select("id, chore_id, child_id, family_id, chores(title, requires_photo, times_per_period, period_unit)")
    .eq("id", assignmentId)
    .eq("child_id", childId)
    .eq("family_id", authorization.familyId)
    .single()

  if (!assignment) return { error: "Assignment not found" }

  const chore = (() => {
    const raw = assignment.chores
    if (!raw) return null
    return Array.isArray(raw) ? raw[0] ?? null : raw
  })() as { title: string; requires_photo: boolean; times_per_period: number; period_unit: string } | null

  if (chore?.requires_photo && !photoUrl) {
    return { error: "A photo is required for this chore" }
  }

  const timesAllowed = chore?.times_per_period ?? 1
  const periodUnit = chore?.period_unit ?? "day"

  const now = new Date()
  let periodStart: Date
  if (periodUnit === "week") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
  } else if (periodUnit === "month") {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }

  const { data: existing } = await supabase
    .from("chore_completions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("child_id", childId)
    .in("status", ["pending_approval", "approved"])
    .gte("completed_at", periodStart.toISOString())

  if ((existing?.length ?? 0) >= timesAllowed) {
    return { error: timesAllowed === 1 ? "Already submitted" : `Already completed ${timesAllowed}× this ${periodUnit}` }
  }

  const { error } = await supabase.from("chore_completions").insert({
    assignment_id: assignmentId,
    chore_id: assignment.chore_id,
    child_id: childId,
    family_id: assignment.family_id,
    status: "pending_approval",
    photo_url: photoUrl ?? null,
    completed_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }

  await supabase.from("activity_logs").insert({
    family_id: assignment.family_id,
    child_id: childId,
    actor_type: "child",
    event_type: "chore_completed",
    metadata: { chore_title: chore?.title ?? "a chore", assignment_id: assignmentId },
  })

  revalidatePath(`/kid/${childId}/missions`)
  revalidatePath(`/kid/${childId}/dashboard`)
  revalidatePath("/parent/approvals")
  revalidatePath("/parent/dashboard")
  return { success: true }
}
