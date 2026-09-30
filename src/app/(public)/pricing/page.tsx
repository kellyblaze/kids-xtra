import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, ShieldCheck, Sparkles } from "lucide-react"

const FEATURES_INCLUDED = [
  "Unlimited children",
  "Unlimited chores",
  "Unlimited rewards",
  "Credit tracking",
  "Approval workflow",
  "Activity history",
  "Photo proof for chores",
  "AI chore suggestions",
  "Weekly family reports",
  "Schedules and reminders",
  "Streaks, XP, and leaderboards",
  "Exportable family activity",
  "Priority support",
]

export default function PricingPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-violet-50 via-white to-amber-50 px-4 py-16">
      <div className="mx-auto max-w-4xl space-y-12">
      <div className="text-center space-y-3">
        <p className="font-black uppercase tracking-widest text-amber-600"><Sparkles className="mr-2 inline size-4" />One plan. Everything included.</p>
        <h1 className="text-4xl font-black text-slate-900 sm:text-5xl">Your first month is free</h1>
        <p className="text-lg text-slate-600">Then just $6 per month for the whole family. Cancel anytime.</p>
      </div>

      <section className="overflow-hidden rounded-[2rem] border-4 border-violet-200 bg-white shadow-[0_10px_0_#ddd6fe]">
        <div className="grid md:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col justify-between bg-violet-600 p-8 text-white sm:p-10">
            <div>
              <p className="text-sm font-black uppercase tracking-widest text-violet-200">30 days free</p>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-6xl font-black">$0</span>
                <span className="pb-2 font-bold text-violet-200">first month</span>
              </div>
              <p className="mt-5 text-lg font-bold">Then $6/month</p>
              <p className="mt-1 text-sm text-violet-100">No tiers, feature gates, or per-child fees.</p>
            </div>
            <p className="mt-8 flex items-center gap-2 text-xs text-violet-100">
              <ShieldCheck className="size-4" /> Secure payments powered by Stripe
            </p>
          </div>
          <div className="p-8 sm:p-10">
            <h2 className="text-xl font-black text-slate-900">The complete family toolkit</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {FEATURES_INCLUDED.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Check className="size-4 text-emerald-600 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8 h-12 w-full rounded-2xl bg-violet-600 text-base font-black hover:bg-violet-700 focus-visible:ring-violet-500 active:translate-y-0.5">
              <Link href="/signup">Start your free month</Link>
            </Button>
            <p className="mt-3 text-center text-xs text-slate-500">Payment method required. Cancel before the trial ends and you won&apos;t be charged.</p>
          </div>
        </div>
      </section>

      <p className="text-center text-sm text-muted-foreground">
        One simple monthly plan after your trial.{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy policy</Link>
        {" · "}
        <Link href="/terms" className="underline underline-offset-2">Terms</Link>
      </p>
      </div>
    </div>
  )
}
