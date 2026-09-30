"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getAppUrl, getStripe, getStripePriceId, hasSubscriptionAccess } from "@/lib/stripe"

async function getBillingFamily() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("parent_profiles")
    .select("family_id, families(*)")
    .eq("id", user.id)
    .single()

  const family = Array.isArray(profile?.families) ? profile.families[0] : profile?.families
  if (!profile || !family) redirect("/setup")
  return { user, family, admin }
}

export async function startSubscription() {
  const { user, family, admin } = await getBillingFamily()
  const stripe = getStripe()
  const appUrl = getAppUrl()

  if (hasSubscriptionAccess(family.subscription_status) && family.stripe_customer_id) {
    redirect("/parent/dashboard")
  }

  let customerId = family.stripe_customer_id as string | null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: family.name,
      metadata: { family_id: family.id },
    }, { idempotencyKey: `family-customer-${family.id}` })
    customerId = customer.id
    const { error } = await admin
      .from("families")
      .update({ stripe_customer_id: customerId })
      .eq("id", family.id)
    if (error) throw new Error("Could not save the billing customer")
  }

  const recentSessions = await stripe.checkout.sessions.list({ customer: customerId, limit: 10 })
  const openSession = recentSessions.data.find(
    (item) => item.mode === "subscription" && item.status === "open" && item.url
  )
  if (openSession?.url) redirect(openSession.url)

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: family.id,
    line_items: [{ price: getStripePriceId(), quantity: 1 }],
    subscription_data: {
      trial_period_days: 30,
      metadata: { family_id: family.id },
    },
    metadata: { family_id: family.id },
    success_url: `${appUrl}/parent/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/parent/billing?checkout=cancelled`,
    allow_promotion_codes: true,
  })

  if (!session.url) throw new Error("Stripe did not return a Checkout URL")
  redirect(session.url)
}

export async function openBillingPortal() {
  const { family } = await getBillingFamily()
  if (!family.stripe_customer_id) redirect("/parent/billing")

  const session = await getStripe().billingPortal.sessions.create({
    customer: family.stripe_customer_id,
    return_url: `${getAppUrl()}/parent/settings`,
  })
  redirect(session.url)
}
