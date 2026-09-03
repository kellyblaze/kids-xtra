import "server-only"

import { headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"

interface RateLimitOptions {
  action: string
  subject?: string
  maxAttempts: number
  windowSeconds: number
  blockSeconds: number
}

interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds: number
}

function getSecret(): string {
  const secret = process.env.KID_SESSION_SECRET
  if (!secret) throw new Error("KID_SESSION_SECRET is not configured")
  return secret
}

async function hashIdentifier(value: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value))
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function consumeRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const requestHeaders = await headers()
  const forwardedFor = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
  const clientAddress = forwardedFor || requestHeaders.get("x-real-ip") || "unknown"
  const bucketKey = await hashIdentifier(`${options.action}:${clientAddress}:${options.subject ?? ""}`)

  const admin = createAdminClient()
  const { data, error } = await admin.rpc("consume_auth_rate_limit", {
    p_bucket_key: bucketKey,
    p_max_attempts: options.maxAttempts,
    p_window_seconds: options.windowSeconds,
    p_block_seconds: options.blockSeconds,
  })

  if (error) throw new Error("Rate limit service unavailable", { cause: error })

  const result = Array.isArray(data) ? data[0] : data
  if (!result || typeof result.allowed !== "boolean") {
    throw new Error("Invalid rate limit response")
  }

  return {
    allowed: result.allowed,
    retryAfterSeconds: Number(result.retry_after_seconds) || 0,
  }
}
