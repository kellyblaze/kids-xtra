import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Star,
  CheckCircle,
  Sparkles,
  Shield,
  Heart,
  Zap,
  ArrowRight,
  Users,
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Star className="w-5 h-5 text-white fill-white" />
            </div>
            <span className="font-bold text-xl text-foreground">Kids Xtra</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-foreground transition-colors">How it works</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button>
              <Link href="/signup">Get started free</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-violet-50 py-20 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-6 text-primary border-primary/20">
              <Sparkles className="w-3 h-3 mr-1" />
              Family-friendly · Parent-controlled · Safe for kids
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              Turn chores into{" "}
              <span className="text-primary">wins</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
              Kids Xtra helps children ages 6–10 complete chores, build routines, and earn rewards — while giving parents full control.
            </p>
            <p className="text-base text-muted-foreground/70 mb-10 italic">
              Extra effort. Extra rewards. Extra growth.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base px-8">
                <Link href="/signup">
                  Start for free
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8">
                <Link href="#how-it-works">See how it works</Link>
              </Button>
            </div>
          </div>
          <div className="absolute top-10 left-10 w-64 h-64 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* Trust bar */}
        <section className="border-y bg-white py-6">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              {[
                { icon: Shield, text: "Parent-controlled" },
                { icon: Heart, text: "Safe for kids ages 6–10" },
                { icon: CheckCircle, text: "No child email required" },
                { icon: Zap, text: "Works on any device" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything your family needs
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Assign chores, approve completions, and reward great effort — all in one place.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border bg-card p-6 hover:shadow-md transition-shadow"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20 bg-slate-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Three simple steps to get your family started.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {steps.map((s, i) => (
                <div key={s.title} className="text-center">
                  <div className="w-14 h-14 rounded-full bg-primary text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                  <p className="text-muted-foreground text-sm">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-br from-primary to-violet-600 text-white">
          <div className="container mx-auto px-4 text-center">
            <Users className="w-12 h-12 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to build better habits?
            </h2>
            <p className="text-white/80 max-w-xl mx-auto mb-8">
              Create your free family account in under 2 minutes. No credit card required.
            </p>
            <Button size="lg" variant="secondary" className="text-primary font-semibold">
              <Link href="/signup">
                Create your family account
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-primary flex items-center justify-center">
                <Star className="w-3.5 h-3.5 text-white fill-white" />
              </div>
              <span className="font-semibold text-foreground">Kids Xtra</span>
            </div>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            </div>
            <p>© {new Date().getFullYear()} Kids Xtra. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    icon: CheckCircle,
    title: "Chore Assignments",
    desc: "Create tasks with categories, schedules, and credit values. Assign to one child or all.",
  },
  {
    icon: Star,
    title: "Credit System",
    desc: "Kids earn credits for completed chores. Every transaction is tracked for full transparency.",
  },
  {
    icon: Sparkles,
    title: "Reward Store",
    desc: "Parents create custom rewards. Kids browse and redeem — with parent approval.",
  },
  {
    icon: Shield,
    title: "Parent Controls",
    desc: "You approve every completion and redemption. Full control, always.",
  },
  {
    icon: Heart,
    title: "Kid-Friendly UI",
    desc: "Big cards, simple language, and colorful design make it easy for ages 6–10.",
  },
  {
    icon: Zap,
    title: "Activity History",
    desc: "Track everything: chores done, credits earned, rewards redeemed — all in one feed.",
  },
]

const steps = [
  {
    title: "Create your family",
    desc: "Sign up as a parent and add your children's profiles. No email required for kids.",
  },
  {
    title: "Assign missions",
    desc: "Create chores and daily routines with credit values. Kids see them on their dashboard.",
  },
  {
    title: "Earn and celebrate",
    desc: "Approve completions, award credits, and let kids redeem rewards they actually want.",
  },
]
