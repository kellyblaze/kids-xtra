import Link from "next/link"
import { redirect } from "next/navigation"
import { Check, ShieldCheck, Sparkles } from "lucide-react"
import { startSubscription } from "@/app/actions/billing"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import { hasSubscriptionAccess } from "@/lib/stripe"

const features = [
  "Unlimited children, Missions, and Rewards",
  "Credit tracking, streaks, and XP levels",
  "Parent approvals and photo proof",
  "Schedules, reminders, and activity history",
  "Xtra Coach Mission plans and weekly reports",
]

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("parent_profiles")
    .select("families(subscription_status)")
    .eq("id", user.id)
    .single()
  const family = Array.isArray(profile?.families) ? profile.families[0] : profile?.families
  if (hasSubscriptionAccess(family?.subscription_status)) redirect("/parent/dashboard")
  const cancelled = (await searchParams).checkout === "cancelled"

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-amber-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="font-black text-xl text-violet-700">Kids Xtra</Link>
        <section className="mt-8 overflow-hidden rounded-[2rem] border-4 border-violet-200 bg-white shadow-[0_10px_0_#ddd6fe]">
          <div className="bg-violet-600 px-6 py-4 text-center text-sm font-black uppercase tracking-widest text-white">
            <Sparkles className="mr-2 inline size-4" /> Every feature included
          </div>
          <div className="p-6 sm:p-10">
            <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-wider text-amber-600">First 30 days</p>
                <h1 className="mt-1 text-4xl font-black text-slate-900">Free</h1>
                <p className="mt-2 text-slate-600">Then $6 per month. Cancel anytime.</p>
              </div>
              <div className="rounded-2xl border-2 border-violet-100 bg-violet-50 px-6 py-4 text-center">
                <span className="text-4xl font-black text-violet-700">$6</span>
                <span className="block text-sm font-bold text-slate-500">per month after trial</span>
              </div>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm font-medium text-slate-700">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {feature}
                </li>
              ))}
            </ul>

            {cancelled && (
              <p role="status" className="mt-6 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800">
                Checkout was cancelled. Your account is safe, and you can restart whenever you are ready.
              </p>
            )}

            <form action={startSubscription} className="mt-8">
              <Button type="submit" className="h-12 w-full rounded-2xl bg-violet-600 text-base font-black hover:bg-violet-700 focus-visible:ring-violet-500 active:translate-y-0.5">
                Start my free month
              </Button>
            </form>
            <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-500">
              <ShieldCheck className="size-4" /> Secure checkout powered by Stripe. A payment method is required.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
