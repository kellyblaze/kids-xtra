"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

async function getParentFamilyId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  const { data } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", userId)
    .single()
  return data?.family_id ?? null
}

export async function createChildProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const familyId = await getParentFamilyId(supabase, user.id)
  if (!familyId) return { error: "Family not found" }

  const { error } = await supabase.from("child_profiles").insert({
    family_id: familyId,
    name: formData.get("name") as string,
    nickname: (formData.get("nickname") as string) || null,
    avatar_key: (formData.get("avatar_key") as string) || "star",
    color_theme: (formData.get("color_theme") as string) || "purple",
  })

  if (error) return { error: error.message }

  revalidatePath("/parent/children")
  revalidatePath("/parent/dashboard")
  return { success: true }
}

export async function updateChildProfile(childId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const familyId = await getParentFamilyId(supabase, user.id)
  if (!familyId) return { error: "Family not found" }

  const { error } = await supabase
    .from("child_profiles")
    .update({
      name: formData.get("name") as string,
      nickname: (formData.get("nickname") as string) || null,
      avatar_key: (formData.get("avatar_key") as string) || "star",
      color_theme: (formData.get("color_theme") as string) || "purple",
    })
    .eq("id", childId)
    .eq("family_id", familyId)

  if (error) return { error: error.message }

  revalidatePath("/parent/children")
  revalidatePath(`/parent/children/${childId}`)
  revalidatePath("/parent/dashboard")
  return { success: true }
}

export async function deleteChildProfile(childId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const familyId = await getParentFamilyId(supabase, user.id)
  if (!familyId) return { error: "Family not found" }

  // Soft delete to preserve credit/chore history
  const { error } = await supabase
    .from("child_profiles")
    .update({ is_active: false })
    .eq("id", childId)
    .eq("family_id", familyId)

  if (error) return { error: error.message }

  revalidatePath("/parent/children")
  revalidatePath("/parent/dashboard")
  return { success: true }
}
