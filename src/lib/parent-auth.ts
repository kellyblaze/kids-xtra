import "server-only"
import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

// Memoized per-request — multiple RSCs calling this share one auth.getUser() network call
export const getParentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
