import { NextRequest, NextResponse } from "next/server"
import { timingSafeEqual } from "crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import webpush from "web-push"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? ""
  const expected = `Bearer ${process.env.CRON_SECRET}`
  const enc = new TextEncoder()
  const a = enc.encode(authHeader)
  const b = enc.encode(expected)
  const authorized = a.length === b.length && timingSafeEqual(a, b)
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidEmail = process.env.VAPID_EMAIL
  if (!vapidPublic || !vapidPrivate || !vapidEmail) {
    return NextResponse.json({ error: "VAPID not configured" }, { status: 500 })
  }

  webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublic, vapidPrivate)

  const admin = createAdminClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayIso = today.toISOString()
  const tomorrowIso = new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()

  const { data: families } = await admin.from("families").select("id")
  if (!families?.length) return NextResponse.json({ sent: 0 })

  let totalSent = 0

  for (const family of families) {
    const [{ data: assignments }, { data: completionsToday }] = await Promise.all([
      admin
        .from("chore_assignments")
        .select("child_id, child_profiles(name, family_id), chores(id, title, period_unit, is_active)")
        .eq("is_active", true),
      admin
        .from("chore_completions")
        .select("chore_assignments(chore_id)")
        .eq("family_id", family.id)
        .gte("completed_at", todayIso)
        .lt("completed_at", tomorrowIso),
    ])

    const completedChoreIds = new Set(
      (completionsToday ?? []).flatMap((c) => {
        const a = Array.isArray(c.chore_assignments) ? c.chore_assignments[0] : c.chore_assignments
        return (a as { chore_id?: string } | null)?.chore_id ? [(a as { chore_id: string }).chore_id] : []
      }),
    )

    const overdueChores = (assignments ?? []).filter((a) => {
      const chore = Array.isArray(a.chores) ? a.chores[0] : a.chores
      const child = Array.isArray(a.child_profiles) ? a.child_profiles[0] : a.child_profiles
      return (
        (chore as { is_active?: boolean; period_unit?: string; id?: string } | null)?.is_active &&
        (chore as { period_unit?: string } | null)?.period_unit === "day" &&
        (child as { family_id?: string } | null)?.family_id === family.id &&
        !completedChoreIds.has((chore as { id?: string } | null)?.id ?? "")
      )
    })

    if (!overdueChores.length) continue

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("family_id", family.id)

    if (!subscriptions?.length) continue

    const overdueNames = [
      ...new Set(
        overdueChores.map((a) => {
          const chore = Array.isArray(a.chores) ? a.chores[0] : a.chores
          return (chore as { title?: string } | null)?.title ?? "a chore"
        }),
      ),
    ].slice(0, 3)

    const body =
      overdueNames.length === 1
        ? `${overdueNames[0]} hasn't been done yet today`
        : `${overdueNames.slice(0, -1).join(", ")} and more haven't been done yet`

    const payload = JSON.stringify({
      title: "⏰ Chore reminder",
      body,
      url: "/parent/approvals",
    })

    await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush
          .sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
          .then(() => {
            totalSent++
          }),
      ),
    )
  }

  return NextResponse.json({ sent: totalSent })
}
