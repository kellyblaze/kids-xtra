import { NextRequest, NextResponse } from "next/server";
import { authorizeChildAccess } from "@/lib/kid-authorization";
import { isSameOriginRequest } from "@/lib/request-security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isValidPushSubscription } from "@/lib/push-subscription";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as {
    action?: unknown;
    childId?: unknown;
    mode?: unknown;
    subscription?: unknown;
  } | null;
  if (!body || typeof body.childId !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const authorization = await authorizeChildAccess(body.childId);
  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = (request as NextRequest & { ip?: string }).ip
  const subscribeLimit = await consumeRateLimit(
    { action: "push-kid-subscribe", subject: body.childId, maxAttempts: 10, windowSeconds: 3600, blockSeconds: 3600 },
    { ip },
  ).catch(() => ({ allowed: true, retryAfterSeconds: 0 }))
  if (!subscribeLimit.allowed) {
    return NextResponse.json({ error: "Too many subscription requests. Try again later." }, { status: 429 });
  }

  if (!isValidPushSubscription(body.subscription)) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (body.action === "status") {
    const { data } = await admin
      .from("push_subscription_recipients")
      .select("audience, recipient_id")
      .eq("endpoint", body.subscription.endpoint)
      .eq("family_id", authorization.familyId)
      .in("audience", ["child", "shared"]);
    const match = (data ?? []).find((recipient) =>
      recipient.audience === "shared"
      || (recipient.audience === "child" && recipient.recipient_id === body.childId),
    );
    return NextResponse.json({
      active: Boolean(match),
      mode: match?.audience ?? null,
    });
  }

  if (body.action != null && body.action !== "subscribe") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (body.mode !== "child" && body.mode !== "shared") {
    return NextResponse.json({ error: "Invalid reminder mode" }, { status: 400 });
  }

  const mode = body.mode;
  if (mode === "shared" && !authorization.isParentSession) {
    return NextResponse.json({ error: "Parent approval required" }, { status: 403 });
  }

  let parentId: string | null = null;
  if (authorization.isParentSession) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    parentId = user?.id ?? null;
    if (!parentId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { error: deviceError } = await admin.from("push_subscriptions").upsert({
    family_id: authorization.familyId,
    ...(parentId ? { parent_id: parentId } : {}),
    endpoint: body.subscription.endpoint,
    p256dh: body.subscription.keys.p256dh,
    auth: body.subscription.keys.auth,
    device_name: "KidsXtra device",
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "endpoint" });
  if (deviceError) {
    return NextResponse.json({ error: "Could not save reminder device" }, { status: 500 });
  }

  let removeQuery = admin
    .from("push_subscription_recipients")
    .delete()
    .eq("endpoint", body.subscription.endpoint)
    .eq("family_id", authorization.familyId);
  if (authorization.isParentSession) {
    removeQuery = removeQuery.in("audience", ["child", "shared"]);
  } else {
    removeQuery = removeQuery.eq("audience", "child").eq("recipient_id", body.childId);
  }
  const { error: removeError } = await removeQuery;
  if (removeError) {
    return NextResponse.json({ error: "Could not update reminder device" }, { status: 500 });
  }

  const recipientId = mode === "child" ? body.childId : parentId;
  if (!recipientId) {
    return NextResponse.json({ error: "Parent approval required" }, { status: 403 });
  }
  const { error } = await admin.from("push_subscription_recipients").upsert({
    endpoint: body.subscription.endpoint,
    family_id: authorization.familyId,
    audience: mode,
    recipient_id: recipientId,
  }, { onConflict: "endpoint,audience,recipient_id" });
  if (error) {
    return NextResponse.json({ error: "Could not save reminder recipient" }, { status: 500 });
  }
  return NextResponse.json({ success: true, mode });
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as {
    childId?: unknown;
    endpoint?: unknown;
  } | null;
  if (!body || typeof body.childId !== "string" || typeof body.endpoint !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const authorization = await authorizeChildAccess(body.childId);
  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  let query = admin
    .from("push_subscription_recipients")
    .delete()
    .eq("endpoint", body.endpoint)
    .eq("family_id", authorization.familyId);
  if (!authorization.isParentSession) {
    query = query.eq("audience", "child").eq("recipient_id", body.childId);
  } else {
    query = query.in("audience", ["child", "shared"]);
  }
  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not disable reminders" }, { status: 500 });
  }
  const { count } = await admin
    .from("push_subscription_recipients")
    .select("*", { count: "exact", head: true })
    .eq("endpoint", body.endpoint);
  const removeBrowserSubscription = (count ?? 0) === 0;
  if (removeBrowserSubscription) {
    await admin.from("push_subscriptions").delete().eq("endpoint", body.endpoint);
  }
  return NextResponse.json({ success: true, removeBrowserSubscription });
}
