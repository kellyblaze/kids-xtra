import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyPin, signKidSession } from "@/lib/kid-session"
import { KID_SESSION_COOKIE, KID_SESSION_MAX_AGE_SECONDS } from "@/lib/kid-session-constants"
import { consumeRateLimit } from "@/lib/rate-limit"
import { isSameOriginRequest } from "@/lib/request-security"

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
  }

  const form = await request.formData()
  const familyCode = (form.get("familyCode") as string | null)?.trim().toUpperCase() ?? ""
  const childId = (form.get("childId") as string | null)?.trim() ?? ""
  const pin = (form.get("pin") as string | null)?.trim() ?? ""

  const fail = (msg: string, retryAfterSeconds?: number) => {
    const params = new URLSearchParams({ error: msg })
    if (retryAfterSeconds) params.set("retryAfter", String(retryAfterSeconds))
    const response = NextResponse.redirect(
      new URL(`/kids?${params}`, request.url),
      { status: 303 }
    )
    if (retryAfterSeconds) response.headers.set("Retry-After", String(retryAfterSeconds))
    return response
  }

  if (!familyCode || !childId || pin.length !== 4) return fail("Invalid request.")

  try {
    const ip = (request as NextRequest & { ip?: string }).ip
    const [addressLimit, childLimit] = await Promise.all([
      consumeRateLimit({
        action: "kid-pin-address",
        maxAttempts: 20,
        windowSeconds: 15 * 60,
        blockSeconds: 30 * 60,
      }, { ip }),
      consumeRateLimit({
        action: "kid-pin-child",
        subject: `${familyCode}:${childId}`,
        maxAttempts: 5,
        windowSeconds: 15 * 60,
        blockSeconds: 30 * 60,
      }, { ip }),
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

  if (!family) return fail("Family code, profile, or PIN is incorrect.")

  const { data: child } = await admin
    .from("child_profiles")
    .select("id, pin_hash, pin_salt, family_id")
    .eq("id", childId)
    .eq("family_id", family.id)
    .eq("is_active", true)
    .maybeSingle()

  if (!child?.pin_hash) return fail("Family code, profile, or PIN is incorrect.")

  let pinMatches: boolean
  let sessionToken: string
  try {
    pinMatches = await verifyPin(pin, child.pin_hash, child.pin_salt)
    sessionToken = await signKidSession(child.id)
  } catch {
    return fail("Login is temporarily unavailable. Please try again shortly.")
  }

  if (!pinMatches) return fail("Family code, profile, or PIN is incorrect.")

  const response = NextResponse.redirect(
    new URL(`/kid/${child.id}/dashboard`, request.url),
    { status: 303 }
  )

  response.cookies.set(KID_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: KID_SESSION_MAX_AGE_SECONDS,
    path: "/",
  })

  return response
}
