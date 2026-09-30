import "server-only"
import type Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"

function idOf(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id ?? null
}

export async function syncStripeSubscription(subscription: Stripe.Subscription) {
  const admin = createAdminClient()
  const familyId = subscription.metadata.family_id
  const customerId = idOf(subscription.customer)
  if (!familyId && !customerId) throw new Error("Stripe subscription has no family identifier")
  const periodEnd = subscription.items.data[0]?.current_period_end

  const values = {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    subscription_current_period_end: periodEnd
      ? new Date(periodEnd * 1000).toISOString()
      : null,
    trial_ends_at: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
  }

  const query = admin.from("families").update(values)
  const { error } = familyId
    ? await query.eq("id", familyId)
    : await query.eq("stripe_customer_id", customerId as string)

  if (error) throw new Error(`Could not sync Stripe subscription: ${error.message}`)
}
