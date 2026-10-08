import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSameOriginRequest } from "@/lib/request-security"

function isValidSubscription(subscription: unknown): subscription is {
  endpoint: string
  keys: { p256dh: string; auth: string }
} {
  if (!subscription || typeof subscription !== "object") return false
  const value = subscription as Record<string, unknown>
  const keys = value.keys as Record<string, unknown> | undefined
  if (typeof value.endpoint !== "string" || value.endpoint.length > 2048) return false
  try {
    if (new URL(value.endpoint).protocol !== "https:") return false
  } catch {
    return false
  }
  return typeof keys?.p256dh === "string"
    && keys.p256dh.length <= 512
    && typeof keys.auth === "string"
    && keys.auth.length <= 512
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null) as { subscription?: unknown } | null
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  const { subscription } = body
  if (!isValidSubscription(subscription)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const admin = createAdminClient()
  const { error } = await admin.from("push_subscriptions").upsert(
    {
      family_id: profile.family_id,
      parent_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" }
  )

  if (error) return NextResponse.json({ error: "Could not save subscription" }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as { endpoint?: unknown } | null
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  const { endpoint } = body
  if (typeof endpoint !== "string" || endpoint.length > 2048) {
    return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = createAdminClient()
  await admin.from("push_subscriptions").delete()
    .eq("endpoint", endpoint)
    .eq("parent_id", user.id)
  return NextResponse.json({ success: true })
}
