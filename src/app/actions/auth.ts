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

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters." }
  }

  try {
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

    const familyCode = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => (b % 36).toString(36)).join("").toUpperCase()
    const { data: family, error: familyError } = await admin
      .from("families")
      .insert({ name: familyName, family_code: familyCode, subscription_status: "incomplete" })
      .select()
      .single()

    if (familyError || !family) {
      return { error: "Could not create family. Please try again." }
    }

    const { error: profileError } = await admin.from("parent_profiles").insert({
      id: authData.user.id,
      family_id: family.id,
      role: "primary_parent",
      display_name: displayName,
    })

    if (profileError) {
      return { error: "Could not create parent profile. Please try again." }
    }

    await admin.from("family_settings").insert({ family_id: family.id })

    // Record parental consent (COPPA §312.5) — terms acceptance method.
    // This is an interim mechanism; will be upgraded to Stripe billing verification at checkout.
    await admin.from("parental_consents").insert({
      family_id: family.id,
      parent_user_id: authData.user.id,
      consent_method: "terms_acceptance",
      policy_version: "2026-11",
    })
    await admin.from("families").update({ consent_recorded: true }).eq("id", family.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error during signup"
    return { error: message }
  }

  // redirect() must be outside try/catch — it throws NEXT_REDIRECT internally
  redirect("/parent/billing")
}

export async function signIn(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  // Application-layer rate limit — defence-in-depth on top of Supabase's built-in limit
  const { consumeRateLimit } = await import("@/lib/rate-limit")
  const loginLimit = await consumeRateLimit(
    { action: "parent-login", subject: email.toLowerCase(), maxAttempts: 10, windowSeconds: 15 * 60, blockSeconds: 30 * 60 },
  ).catch(() => ({ allowed: true, retryAfterSeconds: 0 }))
  if (!loginLimit.allowed) {
    return { error: "Too many login attempts. Please wait and try again." }
  }

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

export async function ensureFamilyCode(): Promise<{ code: string | null; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { code: null, error: "Not signed in" }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return { code: null, error: "Profile not found" }

  const { data: family } = await admin
    .from("families")
    .select("family_code")
    .eq("id", profile.family_id)
    .single()

  if (family?.family_code) return { code: family.family_code }

  const newCode = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => (b % 36).toString(36)).join("").toUpperCase()
  await admin.from("families").update({ family_code: newCode }).eq("id", profile.family_id)
  return { code: newCode }
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
