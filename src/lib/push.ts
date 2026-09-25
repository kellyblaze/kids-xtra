import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

export async function notifyParentsOfChoreSubmission(
  familyId: string,
  childName: string,
  choreTitle: string,
) {
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return

  try {
    const webpush = await import("web-push")
    webpush.default.setVapidDetails(
      "mailto:noreply@kidsxtra.app",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    )

    const admin = createAdminClient()
    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("family_id", familyId)

    if (!subscriptions?.length) return

    const payload = JSON.stringify({
      title: "Chore submitted! ✅",
      body: `${childName} completed "${choreTitle}" — tap to review`,
      url: "/parent/approvals",
    })

    await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.default.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
      )
    )
  } catch (err) {
    console.error("Push notification failed", err)
  }
}
