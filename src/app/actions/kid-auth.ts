"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { hashPin } from "@/lib/kid-session"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { KID_SESSION_COOKIE } from "@/lib/kid-session-constants"
import { consumeRateLimit } from "@/lib/rate-limit"

export async function getChildrenByFamilyCode(familyCode: string) {
  try {
    const rateLimit = await consumeRateLimit({
      action: "family-code-lookup",
      maxAttempts: 10,
      windowSeconds: 10 * 60,
      blockSeconds: 15 * 60,
    })
    if (!rateLimit.allowed) {
      return { error: "Too many attempts. Please wait before trying again.", children: null }
    }

    const admin = createAdminClient()
    const { data: family } = await admin
      .from("families")
      .select("id")
      .eq("family_code", familyCode.trim().toUpperCase())
      .maybeSingle()

    if (!family) return { error: "Family code not found.", children: null }

    const { data: children } = await admin
      .from("child_profiles")
      .select("id, name, avatar_key")
      .eq("family_id", family.id)
      .eq("is_active", true)
      .order("name")

    return { error: null, children: children ?? [] }
  } catch {
    return { error: "Something went wrong.", children: null }
  }
}

export async function kidLogout() {
  const cookieStore = await cookies()
  cookieStore.delete(KID_SESSION_COOKIE)
  redirect("/kids")
}

export async function setChildPin(childId: string, pin: string) {
  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    return { error: "PIN must be exactly 4 digits." }
  }
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Not authenticated" }

    const { data: profile } = await supabase
      .from("parent_profiles")
      .select("family_id")
      .eq("id", user.id)
      .maybeSingle()
    if (!profile) return { error: "Family not found" }

    const { data: updatedChildren, error } = await supabase
      .from("child_profiles")
      .update({ pin_hash: await hashPin(pin) })
      .eq("id", childId)
      .eq("family_id", profile.family_id)
      .select("id")

    if (error) return { error: "Could not save PIN." }
    if (!updatedChildren?.length) return { error: "Child not found." }
    return { success: true }
  } catch {
    return { error: "Something went wrong." }
  }
}
