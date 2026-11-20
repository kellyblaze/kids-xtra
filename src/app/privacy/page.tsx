import Link from "next/link"
import { Star, AlertTriangle } from "lucide-react"

export const metadata = {
  title: "Privacy Policy – Kids Xtra",
  description: "How Kids Xtra collects, uses, and protects your family's information.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white">
      <header className="p-4 border-b border-violet-100">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-9 h-9 rounded-2xl bg-violet-600 flex items-center justify-center shadow-[0_3px_0_#5b21b6]">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
          <span className="font-black text-xl text-violet-700">Kids Xtra</span>
        </Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 mb-8">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm font-bold text-amber-800">
            This Privacy Policy is a draft pending legal review. It is not yet a legally binding document.
            We are working with legal counsel to finalise it before general availability.
          </p>
        </div>

        <h1 className="text-3xl font-black text-slate-800 mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-500 font-medium mb-8">Last updated: November 2026</p>

        <div className="space-y-8 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">1. Who We Are</h2>
            <p>
              Kids Xtra is a family chore and habit tracking application. We are committed to protecting the
              privacy of children and their parents. Contact us at{" "}
              <a href="mailto:privacy@kids-xtra.app" className="text-violet-600 hover:underline">privacy@kids-xtra.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">2. Children&apos;s Privacy (COPPA)</h2>
            <p>
              Kids Xtra is designed for children under parental supervision. We comply with the Children&apos;s
              Online Privacy Protection Act (COPPA). We do not collect personal information from children
              under 13 without verifiable parental consent.
            </p>
            <p className="mt-3">
              As a parent or guardian, you create and control your child&apos;s profile. You may review, update,
              or delete your child&apos;s information at any time from the parent dashboard or by contacting
              privacy@kids-xtra.app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">3. Information We Collect</h2>
            <h3 className="text-base font-black text-slate-700 mb-2">From parents</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name and email address (for account creation)</li>
              <li>Payment information (processed by Stripe — we do not store card numbers)</li>
            </ul>
            <h3 className="text-base font-black text-slate-700 mb-2 mt-4">From children (created by parents)</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>First name or nickname</li>
              <li>A numeric PIN (stored as a one-way cryptographic hash)</li>
              <li>Chore completion records and activity history</li>
              <li>Photos of completed chores (optional, stored privately)</li>
              <li>Virtual credit balance and reward history</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">4. How We Use Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To operate the app and display family activity</li>
              <li>To send weekly progress reports to parents by email</li>
              <li>To generate AI-suggested chore plans — we never send your child&apos;s name to AI services</li>
              <li>To process subscription payments</li>
              <li>To improve the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">5. Third Parties We Share Data With</h2>
            <p className="mb-3">We share the minimum necessary data with these service providers:</p>
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-violet-50">
                  <tr>
                    <th className="text-left p-3 font-black text-slate-700">Provider</th>
                    <th className="text-left p-3 font-black text-slate-700">Purpose</th>
                    <th className="text-left p-3 font-black text-slate-700">Data shared</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Supabase", "Database and storage", "All app data (hosted in the US)"],
                    ["Vercel", "Hosting", "IP addresses, request metadata"],
                    ["Resend", "Email delivery", "Parent email, weekly report content"],
                    ["Stripe", "Payment processing", "Parent billing information only"],
                    ["Anthropic", "AI chore suggestions", "Child age (integer) and goal text — never names or IDs"],
                  ].map(([provider, purpose, data], i) => (
                    <tr key={provider} className={i % 2 === 1 ? "bg-slate-50" : ""}>
                      <td className="p-3 font-bold text-slate-700">{provider}</td>
                      <td className="p-3">{purpose}</td>
                      <td className="p-3">{data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 font-bold text-slate-700">We do not sell personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">6. Data Retention</h2>
            <p>
              Data is retained while your account is active. Deleted child profiles are permanently removed
              within 90 days. Closed accounts are fully deleted within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">7. Your Rights</h2>
            <p>As a parent or guardian you may:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Review your child&apos;s information in the parent dashboard</li>
              <li>Correct or update information at any time</li>
              <li>Delete a child profile and all associated data</li>
              <li>Close your account and request deletion of all family data</li>
              <li>Opt out of weekly email reports in family settings</li>
            </ul>
            <p className="mt-3">
              Contact privacy@kids-xtra.app to exercise any of these rights. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">8. Security</h2>
            <p>
              We use HTTPS, cryptographically hashed PINs, signed session tokens, and row-level database
              security. If you believe your account is compromised, contact us immediately at
              privacy@kids-xtra.app.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">9. Changes to This Policy</h2>
            <p>
              We will notify you by email and in-app notice at least 30 days before making material changes.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex gap-6 text-sm font-bold text-slate-500">
          <Link href="/terms" className="hover:text-violet-600 transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-violet-600 transition-colors">Back to Home</Link>
        </div>
      </main>
    </div>
  )
}
