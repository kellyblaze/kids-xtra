"use server"

import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { authorizeChildAccess } from "@/lib/kid-authorization"
import { revalidatePath } from "next/cache"
import { notifyParentsOfChoreSubmission } from "@/lib/push"
import { isAuthorizedChorePhotoPath } from "@/lib/chore-photos"

export async function markChoreComplete(
  assignmentId: string,
  childId: string,
  photoPath?: string,
  checklistCompleted: string[] = [],
) {
  const authorization = await authorizeChildAccess(childId)
  if (!authorization) return { error: "Not authorized" }

  const supabase = createAdminClient()

  const { data: assignment } = await supabase
    .from("chore_assignments")
    .select("id, chore_id, child_id, family_id, chores(title, requires_photo, times_per_period, period_unit, checklist_items)")
    .eq("id", assignmentId)
    .eq("child_id", childId)
    .eq("family_id", authorization.familyId)
    .single()

  if (!assignment) return { error: "Assignment not found" }

  const chore = (() => {
    const raw = assignment.chores
    if (!raw) return null
    return Array.isArray(raw) ? raw[0] ?? null : raw
  })() as {
    title: string
    requires_photo: boolean
    times_per_period: number
    period_unit: string
    checklist_items?: string[] | null
  } | null

  if (chore?.requires_photo && !photoPath) {
    return { error: "A photo is required for this Mission" }
  }

  if (photoPath) {
    if (!isAuthorizedChorePhotoPath(photoPath, authorization.familyId, childId)) {
      return { error: "Invalid photo path" }
    }
  }

  const timesAllowed = chore?.times_per_period ?? 1
  const periodUnit = chore?.period_unit ?? "day"
  const checklistItems = chore?.checklist_items ?? []
  const checklistSet = new Set(checklistItems)
  const safeChecklistCompleted = checklistCompleted
    .filter((item) => checklistSet.has(item))
    .slice(0, checklistItems.length)

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
    photo_url: photoPath ?? null,
    checklist_completed: safeChecklistCompleted,
    completed_at: new Date().toISOString(),
  })

  if (error) return { error: error.message }

  await supabase.from("activity_logs").insert({
    family_id: assignment.family_id,
    child_id: childId,
    actor_type: "child",
    event_type: "mission_completed",
    metadata: { mission_title: chore?.title ?? "a Mission", assignment_id: assignmentId },
  })

  // Fire push to parent — non-critical, don't await
  void Promise.resolve(supabase.from("child_profiles").select("name").eq("id", childId).single())
    .then(({ data }) =>
      notifyParentsOfChoreSubmission(
        assignment.family_id,
        data?.name ?? "Your child",
        chore?.title ?? "a Mission",
      )
    )
    .catch(() => {})

  revalidatePath(`/kid/${childId}/missions`)
  revalidatePath(`/kid/${childId}/dashboard`)
  revalidatePath("/parent/approvals")
  revalidatePath("/parent/dashboard")
  return { success: true }
}
