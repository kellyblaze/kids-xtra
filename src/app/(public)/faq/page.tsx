import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  LifeBuoy,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { FAQ_CATEGORIES, SUPPORT_EMAIL } from "@/lib/faq";

const QUICK_START_STEPS = [
  {
    title: "Create your family",
    body: "Sign up as a parent, add children, and set each child's PIN.",
  },
  {
    title: "Add Missions",
    body: "Create responsibilities with schedules, checklists, Credits, XP, and optional photo proof.",
  },
  {
    title: "Review Mission Checks",
    body: "Kids submit finished Missions. Parents approve or send back Needs More Work.",
  },
  {
    title: "Redeem rewards",
    body: "Children save Credits, request rewards, and parents approve when the reward is ready.",
  },
];

export default function FaqPage() {
  const contactHref = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "Kids Xtra help request",
  )}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-white to-amber-50">
      <header className="sticky top-0 z-50 border-b-4 border-violet-100 bg-white">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-2xl bg-violet-600 shadow-[0_4px_0_#5b21b6]">
              <Star className="size-5 fill-white text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-violet-700">
              Kids Xtra
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-500 md:flex">
            <Link href="/#features" className="transition-colors hover:text-violet-600">
              Features
            </Link>
            <Link href="/#how-it-works" className="transition-colors hover:text-violet-600">
              How it works
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-violet-600">
              Pricing
            </Link>
            <Link href="/faq" className="text-violet-700">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden px-4 py-2 text-sm font-bold text-violet-600 transition-colors hover:text-violet-800 sm:inline-flex"
            >
              Parent Login
            </Link>
            <Link
              href="/signup"
              className="rounded-2xl bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_#5b21b6] transition-all hover:translate-y-[2px] hover:bg-violet-700 hover:shadow-[0_2px_0_#5b21b6]"
            >
              Start free month
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="px-4 py-16 sm:py-20">
          <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border-2 border-amber-200 bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700">
                <HelpCircle className="size-4" />
                Help center
              </div>
              <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Everything families need to use Kids Xtra with confidence.
              </h1>
              <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-slate-600">
                Find answers about parent setup, Kid Login, Missions, Credits,
                rewards, photo proof, notifications, privacy, and billing.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 py-3.5 text-base font-black text-white shadow-[0_5px_0_#5b21b6] transition-all hover:translate-y-[2px] hover:bg-violet-700 hover:shadow-[0_3px_0_#5b21b6]"
                >
                  Start free month
                  <ArrowRight className="size-5" />
                </Link>
                <Link
                  href="/kids"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3.5 text-base font-black text-slate-700 shadow-[0_4px_0_#cbd5e1] transition-all hover:translate-y-[2px] hover:bg-slate-50 hover:shadow-[0_2px_0_#cbd5e1]"
                >
                  Kid Login
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border-4 border-violet-200 bg-white p-6 shadow-[0_10px_0_#ddd6fe]">
              <div className="flex items-start gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <Sparkles className="size-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    Quick start
                  </h2>
                  <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                    The basic flow from setup to earning rewards.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {QUICK_START_STEPS.map((step, index) => (
                  <div
                    key={step.title}
                    className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-sm font-black text-white">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-black text-slate-900">{step.title}</h3>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-600">
                        {step.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 pb-16">
          <div className="mx-auto max-w-6xl space-y-8">
            {FAQ_CATEGORIES.map((category) => (
              <section
                key={category.title}
                className="rounded-[2rem] border-2 border-slate-200 bg-white p-5 shadow-[0_5px_0_#e2e8f0] sm:p-6"
              >
                <div className="mb-5 flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">
                      {category.title}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {category.description}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  {category.items.map(({ question, answer }) => (
                    <details
                      key={question}
                      className="group rounded-2xl border border-slate-200 bg-slate-50 open:bg-white"
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-4 font-black text-slate-800 transition-colors hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-600 active:bg-violet-100 [&::-webkit-details-marker]:hidden">
                        <span className="flex-1">{question}</span>
                        <span
                          aria-hidden="true"
                          className="text-xl text-violet-500 transition-transform group-open:rotate-45"
                        >
                          +
                        </span>
                      </summary>
                      <p className="px-4 pb-4 text-sm font-medium leading-7 text-slate-600">
                        {answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </section>

        <section className="px-4 pb-20">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            <div className="rounded-3xl border-2 border-emerald-200 bg-emerald-50 p-6">
              <ShieldCheck className="size-6 text-emerald-700" />
              <h2 className="mt-4 font-black text-emerald-950">
                Parent controlled
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-emerald-800">
                Parents approve Mission completions, rewards, child profiles,
                settings, and billing.
              </p>
            </div>
            <div className="rounded-3xl border-2 border-violet-200 bg-violet-50 p-6">
              <LifeBuoy className="size-6 text-violet-700" />
              <h2 className="mt-4 font-black text-violet-950">
                Still need help?
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-violet-800">
                Email support from your account email when possible. Never send
                passwords or child PINs.
              </p>
              <a
                href={contactHref}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white transition-all hover:bg-violet-700"
              >
                <Mail className="size-4" />
                Email support
              </a>
            </div>
            <div className="rounded-3xl border-2 border-amber-200 bg-amber-50 p-6">
              <Star className="size-6 fill-amber-500 text-amber-500" />
              <h2 className="mt-4 font-black text-amber-950">
                Helpful links
              </h2>
              <div className="mt-3 grid gap-2 text-sm font-black text-amber-800">
                <Link href="/pricing" className="hover:text-amber-950">
                  Pricing
                </Link>
                <Link href="/privacy" className="hover:text-amber-950">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-amber-950">
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
