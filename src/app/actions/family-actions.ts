"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateFamilySettings(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return { error: "Profile not found" }

  const familyName = (formData.get("family_name") as string)?.trim()
  const displayName = (formData.get("display_name") as string)?.trim()

  if (!familyName) return { error: "Family name is required" }

  const [familyResult, profileResult] = await Promise.all([
    supabase
      .from("families")
      .update({ name: familyName })
      .eq("id", profile.family_id),
    supabase
      .from("parent_profiles")
      .update({ display_name: displayName || null })
      .eq("id", user.id),
  ])

  if (familyResult.error) return { error: familyResult.error.message }
  if (profileResult.error) return { error: profileResult.error.message }

  revalidatePath("/parent/settings")
  return { success: true }
}
