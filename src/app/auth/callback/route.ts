import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/parent/dashboard"

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`)
  }

  // After a password-reset link the session type is "recovery" — send the
  // user to the dedicated update-password page instead of the original `next`.
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session?.user?.recovery_sent_at) {
    return NextResponse.redirect(`${origin}/auth/update-password`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
