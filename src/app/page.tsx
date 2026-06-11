import Link from "next/link"
import Image from "next/image"
import {
  Star,
  CheckCircle,
  Sparkles,
  Shield,
  Heart,
  Zap,
  ArrowRight,
  Trophy,
  Flame,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b-4 border-violet-100 bg-white">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-violet-600 flex items-center justify-center shadow-[0_4px_0_#5b21b6]">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-black text-2xl text-violet-700 tracking-tight">Kids Xtra</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-slate-500">
            <Link href="#features" className="hover:text-violet-600 transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-violet-600 transition-colors">How it works</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="font-bold text-violet-600 hover:text-violet-800 transition-colors text-sm px-4 py-2">
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm px-5 py-2.5 rounded-2xl shadow-[0_4px_0_#5b21b6] hover:shadow-[0_2px_0_#5b21b6] hover:translate-y-[2px] transition-all"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-violet-50 to-white pt-16 pb-0">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="text-left">
                <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 font-bold text-sm px-4 py-2 rounded-full mb-6 border-2 border-amber-200">
                  <Sparkles className="w-4 h-4" />
                  The #1 chore app for families
                </div>
                <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-800 mb-6 leading-[1.1]">
                  Turn chores into{" "}
                  <span className="text-violet-600 relative inline-block">
                    adventures!
                    <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none" aria-hidden="true">
                      <path d="M2 8 Q75 2 150 8 Q225 14 298 8" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" fill="none"/>
                    </svg>
                  </span>
                </h1>
                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                  Kids earn credits for chores, unlock rewards, and build real-life habits — while parents stay fully in control.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-black text-lg px-8 py-4 rounded-2xl shadow-[0_6px_0_#5b21b6] hover:shadow-[0_3px_0_#5b21b6] hover:translate-y-[3px] transition-all"
                  >
                    Start for free
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link
                    href="#how-it-works"
                    className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-lg px-8 py-4 rounded-2xl border-2 border-slate-200 shadow-[0_4px_0_#cbd5e1] hover:shadow-[0_2px_0_#cbd5e1] hover:translate-y-[2px] transition-all"
                  >
                    See how it works
                  </Link>
                </div>
                {/* Stats */}
                <div className="flex gap-6 mt-10">
                  {[
                    { emoji: "👨‍👩‍👧‍👦", value: "1,000+", label: "Families" },
                    { emoji: "✅", value: "50k+", label: "Chores done" },
                    { emoji: "⭐", value: "4.9/5", label: "Rating" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className="text-2xl font-black text-slate-800">{s.emoji} {s.value}</p>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero image */}
              <div className="relative hidden md:block">
                <div className="relative rounded-3xl overflow-hidden border-4 border-violet-200 shadow-2xl">
                  <Image
                    src="https://images.pexels.com/photos/3874419/pexels-photo-3874419.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                    alt="Happy family doing chores together"
                    width={940}
                    height={650}
                    className="w-full h-80 object-cover"
                    unoptimized
                  />
                </div>
                {/* Floating cards */}
                <div className="absolute -left-8 top-12 bg-white rounded-2xl border-2 border-emerald-200 shadow-lg p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700">Chore approved!</p>
                    <p className="text-xs text-emerald-600 font-bold">+20 ⭐ credits</p>
                  </div>
                </div>
                <div className="absolute -right-6 bottom-16 bg-white rounded-2xl border-2 border-amber-200 shadow-lg p-3 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700">7-day streak!</p>
                    <p className="text-xs text-amber-600 font-bold">Keep it up 🔥</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-y-4 border-slate-100 bg-white py-6 mt-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 text-sm font-bold text-slate-500">
              {[
                { icon: Shield, text: "Parent-controlled" },
                { icon: Heart, text: "Safe for kids ages 6–10" },
                { icon: CheckCircle, text: "No child email required" },
                { icon: Zap, text: "Works on any device" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon className="w-5 h-5 text-violet-500" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Photo feature rows */}
        <section id="features" className="py-24 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-4">
                Everything your family needs 🏡
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto text-lg font-medium">
                Assign chores, approve completions, and reward great effort — all in one place.
              </p>
            </div>

            <div className="space-y-16 max-w-5xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="rounded-3xl overflow-hidden border-4 border-violet-200 shadow-xl">
                  <Image
                    src="https://images.pexels.com/photos/5591853/pexels-photo-5591853.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                    alt="Child doing chores"
                    width={940}
                    height={650}
                    className="w-full h-64 object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <div className="text-5xl mb-4">🧹</div>
                  <h3 className="text-3xl font-black text-slate-800 mb-3">Chores become missions</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Transform everyday tasks into exciting missions with credit rewards, streaks, and XP levels. Kids actually <em>want</em> to help out.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="md:order-2 rounded-3xl overflow-hidden border-4 border-amber-200 shadow-xl">
                  <Image
                    src="https://images.pexels.com/photos/7492915/pexels-photo-7492915.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                    alt="Kids learning and earning rewards"
                    width={940}
                    height={650}
                    className="w-full h-64 object-cover"
                    unoptimized
                  />
                </div>
                <div className="md:order-1">
                  <div className="text-5xl mb-4">🎁</div>
                  <h3 className="text-3xl font-black text-slate-800 mb-3">Earn real rewards</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Parents create a custom reward store — screen time, treats, experiences. Kids browse and redeem with credits they&apos;ve earned.
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div className="rounded-3xl overflow-hidden border-4 border-emerald-200 shadow-xl">
                  <Image
                    src="https://images.pexels.com/photos/8087926/pexels-photo-8087926.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                    alt="Happy family at home"
                    width={940}
                    height={650}
                    className="w-full h-64 object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <div className="text-5xl mb-4">👪</div>
                  <h3 className="text-3xl font-black text-slate-800 mb-3">Parents stay in control</h3>
                  <p className="text-slate-600 text-lg leading-relaxed">
                    Approve every completion, manage rewards, and track your family&apos;s progress. Full visibility, zero stress.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature cards grid */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {features.map((f) => (
                <div
                  key={f.title}
                  className={`rounded-3xl border-4 ${f.borderColor} bg-white p-6 shadow-[0_4px_0_0] ${f.shadowColor} hover:translate-y-[2px] hover:shadow-[0_2px_0_0] transition-all`}
                >
                  <div className="text-4xl mb-3">{f.emoji}</div>
                  <h3 className="font-black text-lg text-slate-800 mb-2">{f.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-24 bg-violet-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-black text-slate-800 mb-4">
                Up and running in minutes ⚡
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto text-lg font-medium">
                Three simple steps to transform your family routine.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {steps.map((s, i) => (
                <div key={s.title} className="bg-white rounded-3xl border-4 border-violet-200 p-8 text-center shadow-[0_6px_0_#c4b5fd]">
                  <div className="w-16 h-16 rounded-2xl bg-violet-600 text-white text-2xl font-black flex items-center justify-center mx-auto mb-5 shadow-[0_4px_0_#5b21b6]">
                    {i + 1}
                  </div>
                  <div className="text-4xl mb-3">{s.emoji}</div>
                  <h3 className="font-black text-xl text-slate-800 mb-2">{s.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-gradient-to-br from-violet-600 to-purple-700 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" aria-hidden="true">
            <div className="absolute top-8 left-16 text-8xl">⭐</div>
            <div className="absolute bottom-8 right-16 text-8xl">🏆</div>
            <div className="absolute top-1/2 left-1/3 text-6xl">🎯</div>
          </div>
          <div className="container mx-auto px-4 text-center relative">
            <Trophy className="w-16 h-16 mx-auto mb-6 text-amber-300" />
            <h2 className="text-4xl md:text-5xl font-black mb-4">
              Ready to build better habits?
            </h2>
            <p className="text-white/80 max-w-xl mx-auto mb-10 text-lg font-medium">
              Join thousands of families. Free forever — no credit card required.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-3 bg-amber-400 hover:bg-amber-500 text-slate-900 font-black text-xl px-10 py-5 rounded-2xl shadow-[0_6px_0_#b45309] hover:shadow-[0_3px_0_#b45309] hover:translate-y-[3px] transition-all"
            >
              Create your family account — it&apos;s free!
              <ArrowRight className="w-6 h-6" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t-4 border-slate-100 bg-white py-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-bold text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center shadow-[0_3px_0_#5b21b6]">
                <Star className="w-4 h-4 text-white fill-white" />
              </div>
              <span className="font-black text-lg text-violet-700">Kids Xtra</span>
            </div>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-violet-600 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-violet-600 transition-colors">Terms of Service</Link>
            </div>
            <p>© {new Date().getFullYear()} Kids Xtra. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  { emoji: "✅", title: "Chore Missions", desc: "Create tasks with schedules, credit values, and photo proof options.", borderColor: "border-emerald-200", shadowColor: "shadow-emerald-200" },
  { emoji: "⭐", title: "Credit System", desc: "Kids earn credits for every approved chore. Fully transparent.", borderColor: "border-amber-200", shadowColor: "shadow-amber-200" },
  { emoji: "🎁", title: "Reward Store", desc: "Custom rewards parents create. Kids browse and redeem.", borderColor: "border-violet-200", shadowColor: "shadow-violet-200" },
  { emoji: "🔥", title: "Streaks & XP", desc: "Daily streaks and XP levels keep kids motivated and engaged.", borderColor: "border-orange-200", shadowColor: "shadow-orange-200" },
  { emoji: "🛡️", title: "Parent Controls", desc: "Approve every completion and redemption. You're always in control.", borderColor: "border-blue-200", shadowColor: "shadow-blue-200" },
  { emoji: "📊", title: "Activity Feed", desc: "Track chores, credits, and rewards in a live family activity log.", borderColor: "border-pink-200", shadowColor: "shadow-pink-200" },
]

const steps = [
  { emoji: "👨‍👩‍👧", title: "Create your family", desc: "Sign up as a parent and add children's profiles. No email needed for kids." },
  { emoji: "🗂️", title: "Assign missions", desc: "Create chores with credit values. Kids see them instantly on their dashboard." },
  { emoji: "🎉", title: "Earn and celebrate", desc: "Approve completions, award credits, and let kids redeem amazing rewards." },
]
