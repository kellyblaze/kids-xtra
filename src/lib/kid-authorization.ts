import "server-only"

import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { KID_SESSION_COOKIE } from "@/lib/kid-session-constants"
import { verifyKidSession } from "@/lib/kid-session"

interface AuthorizedChild {
  familyId: string
  isParentSession: boolean
}

export async function authorizeChildAccess(childId: string): Promise<AuthorizedChild | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(KID_SESSION_COOKIE)?.value

  if (token && await verifyKidSession(token) === childId) {
    const admin = createAdminClient()
    const { data: child } = await admin
      .from("child_profiles")
      .select("family_id")
      .eq("id", childId)
      .eq("is_active", true)
      .maybeSingle()

    return child ? { familyId: child.family_id, isParentSession: false } : null
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .maybeSingle()
  if (!profile) return null

  const admin = createAdminClient()
  const { data: child } = await admin
    .from("child_profiles")
    .select("id")
    .eq("id", childId)
    .eq("family_id", profile.family_id)
    .eq("is_active", true)
    .maybeSingle()

  return child ? { familyId: profile.family_id, isParentSession: true } : null
}
