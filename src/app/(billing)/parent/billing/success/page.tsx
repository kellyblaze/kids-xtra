import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe } from "@/lib/stripe"
import { syncStripeSubscription } from "@/lib/stripe-subscriptions"

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("parent_profiles")
    .select("family_id")
    .eq("id", user.id)
    .single()
  if (!profile) redirect("/setup")

  const sessionId = (await searchParams).session_id
  if (!sessionId) redirect("/parent/billing")
  const session = await getStripe().checkout.sessions.retrieve(sessionId)
  if (session.client_reference_id !== profile.family_id || !session.subscription) {
    redirect("/parent/billing")
  }

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription.id
  const subscription = await getStripe().subscriptions.retrieve(subscriptionId)
  await syncStripeSubscription(subscription)

  // Send new subscribers straight into the wizard; returning users who re-visit
  // this URL (e.g. via browser history) go to the dashboard instead.
  const { data: family } = await admin
    .from("families")
    .select("settings")
    .eq("id", profile.family_id)
    .single()
  const settings = family?.settings as Record<string, unknown> | null
  const onboarding = settings?.onboarding as { completed?: boolean } | undefined
  const destination = onboarding?.completed ? "/parent/dashboard" : "/parent/onboarding"

  redirect(destination)
}
