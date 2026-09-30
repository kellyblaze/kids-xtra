import Link from "next/link"
import { redirect } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
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

  return (
    <main className="grid min-h-screen place-items-center bg-violet-50 px-4">
      <section className="max-w-lg rounded-[2rem] border-4 border-emerald-200 bg-white p-8 text-center shadow-[0_10px_0_#a7f3d0] sm:p-12">
        <CheckCircle2 className="mx-auto size-16 text-emerald-600" />
        <h1 className="mt-5 text-3xl font-black text-slate-900">Your free month has started!</h1>
        <p className="mt-3 text-slate-600">You now have every Kids Xtra feature. You will be billed $6 per month after your 30-day trial unless you cancel.</p>
        <Link href="/parent/onboarding" className="mt-8 inline-flex rounded-2xl bg-violet-600 px-7 py-3 font-black text-white transition-all hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 active:translate-y-0.5">
          Set up my family
        </Link>
      </section>
    </main>
  )
}
