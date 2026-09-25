"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getTemplateById } from "@/lib/chore-templates"

export async function importChoreTemplates(templateIds: string[]) {
  if (!templateIds.length || templateIds.length > 20) {
    return { error: "Select between 1 and 20 templates" }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return { error: "Profile not found" }

  const { data: existing } = await supabase
    .from("chores")
    .select("title")
    .eq("family_id", profile.family_id)
    .eq("is_active", true)

  const existingTitles = new Set((existing ?? []).map((c) => c.title.toLowerCase()))

  const templates = templateIds
    .map(getTemplateById)
    .filter((t): t is NonNullable<typeof t> => !!t)
    .filter((t) => !existingTitles.has(t.title.toLowerCase()))

  if (!templates.length) return { error: "All selected templates already exist in your chore list" }

  const choresToInsert = templates.map((t) => ({
    family_id: profile.family_id,
    created_by: user.id,
    title: t.title,
    description: t.description,
    category: t.category,
    credit_value: t.creditValue,
    xp_value: t.xpValue,
    period_unit: t.periodUnit,
    times_per_period: t.timesPerPeriod,
    is_active: true,
  }))

  const { error } = await supabase.from("chores").insert(choresToInsert)
  if (error) return { error: error.message }

  revalidatePath("/parent/chores")
  return { success: true, imported: templates.length }
}
