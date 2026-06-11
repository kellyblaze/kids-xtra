"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"

export async function completeSetup(formData: FormData) {
  const displayName = (formData.get("displayName") as string)?.trim()
  const familyName = (formData.get("familyName") as string)?.trim()

  if (!displayName || !familyName) {
    return { error: "Please fill in all fields." }
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: "Not signed in. Please log in first." }

    const admin = createAdminClient()

    // Check if profile already exists (idempotent)
    const { data: existing } = await admin
      .from("parent_profiles")
      .select("family_id")
      .eq("id", user.id)
      .maybeSingle()

    if (!existing) {
      const { data: family, error: familyError } = await admin
        .from("families")
        .insert({ name: familyName })
        .select()
        .single()

      if (familyError || !family) {
        return { error: "Could not create family. Please try again." }
      }

      const { error: profileError } = await admin.from("parent_profiles").insert({
        id: user.id,
        family_id: family.id,
        role: "primary_parent",
        display_name: displayName,
      })

      if (profileError) {
        return { error: "Could not save profile. Please try again." }
      }

      await admin.from("family_settings").insert({ family_id: family.id })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return { error: message }
  }

  redirect("/parent/onboarding")
}
