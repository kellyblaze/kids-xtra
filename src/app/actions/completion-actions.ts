"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function markChoreComplete(assignmentId: string, childId: string, photoUrl?: string) {
  const supabase = await createClient()

  const { data: assignment } = await supabase
    .from("chore_assignments")
    .select("id, chore_id, child_id, family_id, chores(title, requires_photo)")
    .eq("id", assignmentId)
    .eq("child_id", childId)
    .single()

  if (!assignment) return { error: "Assignment not found" }

  const chore = (() => {
    const raw = assignment.chores
    if (!raw) return null
    return Array.isArray(raw) ? raw[0] ?? null : raw
  })()

  if (chore?.requires_photo && !photoUrl) {
    return { error: "A photo is required for this chore" }
  }

  const { data: existing } = await supabase
    .from("chore_completions")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("child_id", childId)
    .in("status", ["pending_approval", "approved"])
    .maybeSingle()

  if (existing) return { error: "Already submitted or approved" }

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
