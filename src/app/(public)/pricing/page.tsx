import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

const FEATURES_FREE = [
  "Up to 3 children",
  "Unlimited chores",
  "Unlimited rewards",
  "Credit tracking",
  "Approval workflow",
  "Activity history",
]

const FEATURES_PRO = [
  "Everything in Free",
  "Unlimited children",
  "Photo proof for chores",
  "AI chore suggestions",
  "Weekly family reports",
  "Priority support",
]

export default function PricingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-12">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">Simple pricing</h1>
        <p className="text-muted-foreground text-lg">Start free. Upgrade when you&apos;re ready.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Free</CardTitle>
            <div className="mt-2">
              <span className="text-4xl font-bold">$0</span>
              <span className="text-muted-foreground ml-1">/ forever</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {FEATURES_FREE.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="w-full">
              <Link href="/signup">Get started free</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2 border-primary relative">
          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most popular</Badge>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Pro</CardTitle>
            <div className="mt-2">
              <span className="text-4xl font-bold">$4</span>
              <span className="text-muted-foreground ml-1">/ month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {FEATURES_PRO.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full">
              <Link href="/signup">Start free trial</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        No credit card required for free plan.{" "}
        <Link href="/privacy" className="underline underline-offset-2">Privacy policy</Link>
        {" · "}
        <Link href="/terms" className="underline underline-offset-2">Terms</Link>
      </p>
    </div>
  )
}
