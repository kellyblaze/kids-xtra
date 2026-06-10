"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export async function signUp(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const displayName = formData.get("displayName") as string
  const familyName = formData.get("familyName") as string

  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  })

  if (authError || !authData.user) {
    return { error: authError?.message ?? "Signup failed" }
  }

  const admin = createAdminClient()

  const { data: family, error: familyError } = await admin
    .from("families")
    .insert({ name: familyName })
    .select()
    .single()

  if (familyError || !family) {
    return { error: "Could not create family" }
  }

  const { error: profileError } = await admin.from("parent_profiles").insert({
    id: authData.user.id,
    family_id: family.id,
    role: "primary_parent",
    display_name: displayName,
  })

  if (profileError) {
    return { error: "Could not create parent profile" }
  }

  await admin.from("family_settings").insert({ family_id: family.id })

  redirect("/parent/onboarding")
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  redirect("/parent/dashboard")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

export async function resetPassword(formData: FormData) {
  const email = formData.get("email") as string
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/parent/settings`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}
