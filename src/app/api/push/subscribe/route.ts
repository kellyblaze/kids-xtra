import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isSameOriginRequest } from "@/lib/request-security"
import { isValidPushSubscription } from "@/lib/push-subscription"
import { consumeRateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const ip = (req as NextRequest & { ip?: string }).ip
  const subscribeLimit = await consumeRateLimit(
    { action: "push-subscribe", subject: user.id, maxAttempts: 10, windowSeconds: 3600, blockSeconds: 3600 },
    { ip },
  ).catch(() => ({ allowed: true, retryAfterSeconds: 0 }))
  if (!subscribeLimit.allowed) {
    return NextResponse.json({ error: "Too many subscription requests. Try again later." }, { status: 429 })
  }

  const body = await req.json().catch(() => null) as { action?: unknown; subscription?: unknown } | null
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  const { subscription } = body
  if (!isValidPushSubscription(subscription)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const admin = createAdminClient()
  if (body.action === "status") {
    const { data } = await admin
      .from("push_subscription_recipients")
      .select("id")
      .eq("endpoint", subscription.endpoint)
      .eq("family_id", profile.family_id)
      .eq("audience", "parent")
      .eq("recipient_id", user.id)
      .maybeSingle()
    return NextResponse.json({ active: Boolean(data) })
  }
  if (body.action != null && body.action !== "subscribe") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const { error: deviceError } = await admin.from("push_subscriptions").upsert(
    {
      family_id: profile.family_id,
      parent_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      device_name: "Parent device",
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  )
  if (deviceError) return NextResponse.json({ error: "Could not save subscription" }, { status: 500 })

  const { error } = await admin.from("push_subscription_recipients").upsert({
    endpoint: subscription.endpoint,
    family_id: profile.family_id,
    audience: "parent",
    recipient_id: user.id,
  }, { onConflict: "endpoint,audience,recipient_id" })
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

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 })

  const admin = createAdminClient()
  const { error } = await admin.from("push_subscription_recipients").delete()
    .eq("endpoint", endpoint)
    .eq("family_id", profile.family_id)
    .eq("audience", "parent")
    .eq("recipient_id", user.id)
  if (error) return NextResponse.json({ error: "Could not disable notifications" }, { status: 500 })

  const { count } = await admin
    .from("push_subscription_recipients")
    .select("*", { count: "exact", head: true })
    .eq("endpoint", endpoint)
  const removeBrowserSubscription = (count ?? 0) === 0
  if (removeBrowserSubscription) {
    await admin.from("push_subscriptions").delete().eq("endpoint", endpoint)
  }
  return NextResponse.json({ success: true, removeBrowserSubscription })
}
