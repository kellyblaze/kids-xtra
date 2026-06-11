"use server"

import { createClient } from "@/lib/supabase/server"

const DEFAULT_REASONS = [
  "Needs more effort",
  "Photo is unclear",
  "Not done correctly",
  "Wrong chore completed",
  "Already counted today",
  "Please try again",
]

export async function getRejectionReasons(): Promise<{ reasons: string[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { reasons: DEFAULT_REASONS }

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return { reasons: DEFAULT_REASONS }

  const { data: existing } = await supabase
    .from("rejection_reasons")
    .select("reason")
    .eq("family_id", profile.family_id)
    .order("created_at")

  if (!existing || existing.length === 0) {
    await supabase.from("rejection_reasons").insert(
      DEFAULT_REASONS.map((reason) => ({
        family_id: profile.family_id,
        reason,
        is_default: true,
      }))
    )
    return { reasons: DEFAULT_REASONS }
  }

  return { reasons: existing.map((r) => r.reason) }
}

export async function addRejectionReason(reason: string): Promise<{ error?: string }> {
  const trimmed = reason.trim()
  if (!trimmed) return { error: "Reason cannot be empty" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return { error: "Profile not found" }

  const { error } = await supabase
    .from("rejection_reasons")
    .insert({ family_id: profile.family_id, reason: trimmed, is_default: false })

  if (error && error.code !== "23505") return { error: error.message }
  return {}
}
