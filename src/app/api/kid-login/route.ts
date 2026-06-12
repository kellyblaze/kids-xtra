import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hashPin } from "@/lib/kid-session"
import { KID_SESSION_COOKIE } from "@/lib/kid-session-constants"

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const familyCode = (form.get("familyCode") as string | null)?.trim().toUpperCase() ?? ""
  const childId = (form.get("childId") as string | null)?.trim() ?? ""
  const pin = (form.get("pin") as string | null)?.trim() ?? ""

  const fail = (msg: string) =>
    NextResponse.redirect(
      new URL(`/kids?error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    )

  if (!familyCode || !childId || pin.length !== 4) return fail("Invalid request.")

  const admin = createAdminClient()

  const { data: family } = await admin
    .from("families")
    .select("id")
    .eq("family_code", familyCode)
    .maybeSingle()

  if (!family) return fail("Family code not found.")

  const { data: child } = await admin
    .from("child_profiles")
    .select("id, pin_hash, family_id")
    .eq("id", childId)
    .eq("family_id", family.id)
    .eq("is_active", true)
    .maybeSingle()

  if (!child) return fail("Profile not found.")
  if (!child.pin_hash) return fail("No PIN set. Ask a parent to set your PIN first.")

  const pinHash = await hashPin(pin)
  if (pinHash !== child.pin_hash) return fail("Wrong PIN. Try again.")

  const response = NextResponse.redirect(
    new URL(`/kid/${child.id}/dashboard`, request.url),
    { status: 303 }
  )

  response.cookies.set(KID_SESSION_COOKIE, child.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })

  return response
}
