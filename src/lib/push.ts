import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"
import { getExpiredPushEndpoints } from "@/lib/push-subscription"
import { logger } from "@/lib/logger"

export async function notifyParentsOfChoreSubmission(
  familyId: string,
  childName: string,
  missionTitle: string,
) {
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_EMAIL) return

  try {
    const webpush = await import("web-push")
    webpush.default.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    )

    const admin = createAdminClient()
    const { data: recipients } = await admin
      .from("push_subscription_recipients")
      .select("endpoint, push_subscriptions!inner(endpoint, p256dh, auth)")
      .eq("family_id", familyId)
      .eq("audience", "parent")

    const subscriptions = (recipients ?? []).flatMap((recipient) => {
      const value = Array.isArray(recipient.push_subscriptions)
        ? recipient.push_subscriptions[0]
        : recipient.push_subscriptions
      return value ? [value] : []
    })
    const uniqueSubscriptions = [...new Map(
      subscriptions.map((subscription) => [subscription.endpoint, subscription]),
    ).values()]
    if (!uniqueSubscriptions.length) return

    const payload = JSON.stringify({
      title: "Mission Check ready",
      body: `${childName} finished ${missionTitle} and is waiting for your Mission Check.`,
      url: "/parent/approvals",
    })

    const results = await Promise.allSettled(
      uniqueSubscriptions.map((sub) =>
        webpush.default.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      )
    )
    const expiredEndpoints = getExpiredPushEndpoints(uniqueSubscriptions, results)
    if (expiredEndpoints.length) {
      await admin.from("push_subscriptions").delete().in("endpoint", expiredEndpoints)
    }
  } catch (err) {
    logger.error("push_notification_failed", { error: err instanceof Error ? err.message : String(err) })
  }
}
