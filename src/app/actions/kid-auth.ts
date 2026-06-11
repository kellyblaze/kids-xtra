"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { signKidSession, hashPin } from "@/lib/kid-session"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export const KID_SESSION_COOKIE = "kid_session"

export async function getChildrenByFamilyCode(familyCode: string) {
  try {
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

export async function kidLogin(familyCode: string, childId: string, pin: string) {
  try {
    const admin = createAdminClient()

    const { data: family } = await admin
      .from("families")
      .select("id")
      .eq("family_code", familyCode.trim().toUpperCase())
      .maybeSingle()

    if (!family) return { error: "Family code not found." }

    const { data: child } = await admin
      .from("child_profiles")
      .select("id, name, pin_hash, family_id")
      .eq("id", childId)
      .eq("family_id", family.id)
      .eq("is_active", true)
      .maybeSingle()

    if (!child) return { error: "Profile not found." }
    if (!child.pin_hash) return { error: "No PIN set yet. Ask a parent to set your PIN first." }
    if (hashPin(pin) !== child.pin_hash) return { error: "Wrong PIN. Try again." }

    const token = signKidSession({ childId: child.id, familyId: family.id, childName: child.name })
    const cookieStore = await cookies()
    cookieStore.set(KID_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })

    return { success: true, childId: child.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error"
    return { error: message }
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
    const admin = createAdminClient()
    const { error } = await admin
      .from("child_profiles")
      .update({ pin_hash: hashPin(pin) })
      .eq("id", childId)

    if (error) return { error: "Could not save PIN." }
    return { success: true }
  } catch {
    return { error: "Something went wrong." }
  }
}
