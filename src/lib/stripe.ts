import "server-only"
import Stripe from "stripe"

let stripeClient: Stripe | undefined

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured")
  stripeClient ??= new Stripe(secretKey)
  return stripeClient
}

export function getStripePriceId() {
  const priceId = process.env.STRIPE_PRICE_ID
  if (!priceId) throw new Error("STRIPE_PRICE_ID is not configured")
  return priceId
}

export function getAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL is not configured")
  return url.replace(/\/$/, "")
}

export const hasSubscriptionAccess = (status: string | null | undefined) =>
  status === "active" || status === "trialing" || status === "past_due"
