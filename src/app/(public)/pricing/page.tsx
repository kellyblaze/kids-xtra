import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, HelpCircle, ShieldCheck, Sparkles } from "lucide-react"

const FEATURES_INCLUDED = [
  "Unlimited children",
  "Unlimited Missions",
  "Unlimited rewards",
  "Credit tracking",
  "Approval workflow",
  "Activity history",
  "Photo proof for Missions",
  "Xtra Coach Mission plans",
  "Weekly family reports",
  "Schedules and reminders",
  "Streaks, XP, and leaderboards",
  "Exportable family activity",
  "Priority support",
]

export default function PricingPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-violet-50 via-white to-amber-50 px-4 py-16">
      <div className="mx-auto max-w-5xl space-y-12">
        <div className="text-center space-y-4">
          <p className="font-black uppercase tracking-widest text-amber-600">
            <Sparkles className="mr-2 inline size-4" />Simple family pricing
          </p>
          <h1 className="text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
            Start free. Then $6/month for the whole family.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            One Kids Xtra subscription includes every child, every Mission, every Reward, and every parent tool. No tiers or per-child fees.
          </p>
        </div>

        <section className="overflow-hidden rounded-[2rem] border-4 border-violet-200 bg-white shadow-[0_10px_0_#ddd6fe]">
          <div className="grid md:grid-cols-[0.85fr_1.15fr]">
            <div className="flex flex-col justify-between bg-violet-600 p-8 text-white sm:p-10">
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-violet-200">30-day free trial</p>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-6xl font-black">$0</span>
                  <span className="pb-2 font-bold text-violet-200">today</span>
                </div>
                <div className="mt-8 rounded-3xl bg-white/10 p-5 ring-1 ring-white/20">
                  <p className="text-sm font-bold uppercase tracking-widest text-violet-200">After trial</p>
                  <p className="mt-2 text-4xl font-black">$6/month</p>
                  <p className="mt-2 text-sm font-bold text-violet-100">One price for your whole family.</p>
                </div>
              </div>
              <p className="mt-8 flex items-center gap-2 text-xs text-violet-100">
                <ShieldCheck className="size-4" /> Secure payments powered by Stripe
              </p>
            </div>
            <div className="p-8 sm:p-10">
              <h2 className="text-2xl font-black text-slate-900">Everything is included</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">
                Use the full Mission, Credits, Rewards, and parent approval system from day one.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {FEATURES_INCLUDED.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Check className="size-4 shrink-0 text-emerald-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-8 h-12 w-full rounded-2xl bg-violet-600 text-base font-black hover:bg-violet-700 focus-visible:ring-violet-500 active:translate-y-0.5">
                <Link href="/signup">Start your free month</Link>
              </Button>
              <p className="mt-3 text-center text-xs text-slate-500">
                Payment method required. Cancel before the trial ends and you won&apos;t be charged.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["No per-child fees", "Add every child in your household under the same plan."],
            ["No locked features", "Missions, Rewards, reports, exports, and Xtra Coach are included."],
            ["Cancel anytime", "Manage your subscription from billing settings whenever you need."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-3xl border-2 border-slate-200 bg-white p-5 shadow-[0_4px_0_#e2e8f0]">
              <HelpCircle className="size-5 text-violet-600" />
              <h3 className="mt-3 font-black text-slate-900">{title}</h3>
              <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">{body}</p>
            </div>
          ))}
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
