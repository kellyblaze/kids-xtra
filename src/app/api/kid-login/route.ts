import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hashPin, signKidSession } from "@/lib/kid-session"
import { KID_SESSION_COOKIE } from "@/lib/kid-session-constants"
import { consumeRateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  const form = await request.formData()
  const familyCode = (form.get("familyCode") as string | null)?.trim().toUpperCase() ?? ""
  const childId = (form.get("childId") as string | null)?.trim() ?? ""
  const pin = (form.get("pin") as string | null)?.trim() ?? ""

  const fail = (msg: string, retryAfterSeconds?: number) => {
    const response = NextResponse.redirect(
      new URL(`/kids?error=${encodeURIComponent(msg)}`, request.url),
      { status: 303 }
    )
    if (retryAfterSeconds) response.headers.set("Retry-After", String(retryAfterSeconds))
    return response
  }

  if (!familyCode || !childId || pin.length !== 4) return fail("Invalid request.")

  try {
    const [addressLimit, childLimit] = await Promise.all([
      consumeRateLimit({
        action: "kid-pin-address",
        maxAttempts: 20,
        windowSeconds: 15 * 60,
        blockSeconds: 30 * 60,
      }),
      consumeRateLimit({
        action: "kid-pin-child",
        subject: `${familyCode}:${childId}`,
        maxAttempts: 5,
        windowSeconds: 15 * 60,
        blockSeconds: 30 * 60,
      }),
    ])
    if (!addressLimit.allowed || !childLimit.allowed) {
      return fail(
        "Too many attempts. Please wait before trying again.",
        Math.max(addressLimit.retryAfterSeconds, childLimit.retryAfterSeconds),
      )
    }
  } catch {
    return fail("Login is temporarily unavailable. Please try again shortly.")
  }

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

  response.cookies.set(KID_SESSION_COOKIE, await signKidSession(child.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })

  return response
}
