"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { isTimeValue, isValidTimeZone } from "@/lib/reminders"

function generateFamilyCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) =>
    (b % 36).toString(36)
  ).join("").toUpperCase()
}

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
  const timeZone = String(formData.get("timezone") ?? "").trim()
  const quietStart = String(formData.get("reminder_quiet_start") ?? "").trim()
  const quietEnd = String(formData.get("reminder_quiet_end") ?? "").trim()
  const parentOverdueNotifications = formData.get("parent_overdue_notifications") === "true"

  if (!familyName) return { error: "Family name is required" }
  if (!isValidTimeZone(timeZone)) return { error: "Choose a valid timezone" }
  if (!isTimeValue(quietStart) || !isTimeValue(quietEnd)) {
    return { error: "Choose valid reminder quiet hours" }
  }
  const admin = createAdminClient()

  const [familyResult, profileResult, settingsResult] = await Promise.all([
    admin
      .from("families")
      .update({ name: familyName })
      .eq("id", profile.family_id),
    admin
      .from("parent_profiles")
      .update({ display_name: displayName || null })
      .eq("id", user.id),
    admin
      .from("family_settings")
      .upsert({
        family_id: profile.family_id,
        timezone: timeZone,
        reminder_quiet_start: quietStart,
        reminder_quiet_end: quietEnd,
        parent_overdue_notifications: parentOverdueNotifications,
      }, { onConflict: "family_id" }),
  ])

  if (familyResult.error) return { error: familyResult.error.message }
  if (profileResult.error) return { error: profileResult.error.message }
  if (settingsResult.error) return { error: settingsResult.error.message }

  revalidatePath("/parent/settings")
  return { success: true }
}

export async function regenerateFamilyCode() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return { error: "Profile not found" }

  const newCode = generateFamilyCode()
  const admin = createAdminClient()
  const { error } = await admin
    .from("families")
    .update({ family_code: newCode })
    .eq("id", profile.family_id)

  if (error) return { error: error.message }

  revalidatePath("/parent/settings")
  return { success: true, code: newCode }
}

export async function toggleWeeklyReport(enabled: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return { error: "Profile not found" }

  const admin = createAdminClient()
  const { data: family } = await admin
    .from("families")
    .select("settings")
    .eq("id", profile.family_id)
    .single()

  const current = (family?.settings && typeof family.settings === "object" ? family.settings : {}) as Record<string, unknown>
  const onboarding = (current.onboarding && typeof current.onboarding === "object" ? current.onboarding : {}) as Record<string, unknown>
  const preferences = (onboarding.preferences && typeof onboarding.preferences === "object" ? onboarding.preferences : {}) as Record<string, unknown>

  const { error } = await admin
    .from("families")
    .update({
      settings: {
        ...current,
        onboarding: {
          ...onboarding,
          preferences: { ...preferences, weeklyReport: enabled },
        },
      },
    })
    .eq("id", profile.family_id)

  if (error) return { error: error.message }
  revalidatePath("/parent/settings")
  return { success: true }
}
