import { NextRequest, NextResponse } from "next/server"
import {
  KID_SESSION_COOKIE,
  KID_SESSION_MAX_AGE_SECONDS,
  KID_SESSION_RENEW_SECONDS,
} from "@/lib/kid-session-constants"
import { getKidSessionExpiry, signKidSession, verifyKidSession } from "@/lib/kid-session"
import { isSameOriginRequest } from "@/lib/request-security"
import { consumeRateLimit } from "@/lib/rate-limit"

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
  }

  const token = request.cookies.get(KID_SESSION_COOKIE)?.value
  if (!token) return NextResponse.json({ refreshed: false }, { status: 401 })

  const childId = await verifyKidSession(token)
  const expiresAt = await getKidSessionExpiry(token)
  if (!childId || !expiresAt) {
    return NextResponse.json({ refreshed: false }, { status: 401 })
  }

  const ip = (request as NextRequest & { ip?: string }).ip
  const refreshLimit = await consumeRateLimit(
    { action: "session-refresh", subject: childId, maxAttempts: 60, windowSeconds: 3600, blockSeconds: 3600 },
    { ip },
  ).catch(() => ({ allowed: true, retryAfterSeconds: 0 }))
  if (!refreshLimit.allowed) {
    return NextResponse.json({ refreshed: false }, { status: 429 })
  }

  const secondsRemaining = expiresAt - Math.floor(Date.now() / 1000)
  const response = NextResponse.json({
    refreshed: secondsRemaining <= KID_SESSION_RENEW_SECONDS,
  })

  if (secondsRemaining <= KID_SESSION_RENEW_SECONDS) {
    response.cookies.set(KID_SESSION_COOKIE, await signKidSession(childId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: KID_SESSION_MAX_AGE_SECONDS,
      path: "/kid",
    })
  }

  return response
}
