import { cookies } from "next/headers"
import { KidLoginContent } from "@/components/kid/KidLoginContent"
import { KID_SESSION_COOKIE } from "@/lib/kid-session-constants"
import { verifyKidSession } from "@/lib/kid-session"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export default async function KidLoginPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(KID_SESSION_COOKIE)?.value
  let resumeChild: { id: string; name: string; avatar_key: string | null } | null = null

  if (token) {
    const childId = await verifyKidSession(token)
    if (childId) {
      const admin = createAdminClient()
      const { data: child } = await admin
        .from("child_profiles")
        .select("id, name, avatar_key")
        .eq("id", childId)
        .eq("is_active", true)
        .maybeSingle()
      resumeChild = child ?? null
    }
  }

  return <KidLoginContent resumeChild={resumeChild} />
}
