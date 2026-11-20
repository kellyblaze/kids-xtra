import Link from "next/link"
import { Star, AlertTriangle } from "lucide-react"

export const metadata = {
  title: "Terms of Service – Kids Xtra",
  description: "Terms and conditions for using the Kids Xtra family app.",
}

export default function TermsPage() {
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
            These Terms of Service are a draft pending legal review. They are not yet legally binding.
            We are working with legal counsel to finalise them before general availability.
          </p>
        </div>

        <h1 className="text-3xl font-black text-slate-800 mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-500 font-medium mb-8">Last updated: November 2026</p>

        <div className="space-y-8 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account on Kids Xtra, you agree to these Terms of Service and our{" "}
              <Link href="/privacy" className="text-violet-600 hover:underline">Privacy Policy</Link>.
              You must be at least 18 years old to create an account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">2. The Service</h2>
            <p>
              Kids Xtra is a subscription-based family chore and habit tracking application. We provide tools
              for parents to assign chores, track completion, award virtual credits, and manage rewards for
              their children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">3. Accounts and Responsibility</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>You are responsible for all activity that occurs under your account.</li>
              <li>You must be a parent or legal guardian to create child profiles.</li>
              <li>Child profiles are created and managed entirely by parents — children do not have independent accounts.</li>
              <li>You may not use the service for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">4. Subscription and Billing</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Access to Kids Xtra requires a paid subscription.</li>
              <li>Subscriptions are billed monthly or annually as selected at sign-up.</li>
              <li>You may cancel your subscription at any time from account settings.</li>
              <li>Cancellations take effect at the end of the current billing period.</li>
              <li>We do not offer refunds for partial billing periods.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">5. Virtual Credits</h2>
            <p>
              Virtual credits within Kids Xtra have no monetary value and cannot be exchanged for cash,
              goods, or services outside of the app. Credits are a motivational tool for children and
              are managed entirely by parents.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">6. Content</h2>
            <p>
              You retain ownership of content you upload (such as chore photos). By uploading content,
              you grant us a limited licence to store and display it to your family members within the app.
              You may not upload content that is illegal, harmful, or violates others&apos; rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">7. Limitation of Liability</h2>
            <p>
              Kids Xtra is provided &quot;as is&quot; without warranties of any kind. We are not liable for any
              indirect, incidental, or consequential damages arising from your use of the service.
              Our total liability is limited to the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">8. Termination</h2>
            <p>
              We may suspend or terminate your account for violations of these terms. You may close your
              account at any time. Upon closure, your data will be deleted in accordance with our
              Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">9. Changes to Terms</h2>
            <p>
              We will notify you by email and in-app notice at least 30 days before making material changes
              to these terms. Continued use of the service after changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-slate-800 mb-3">10. Contact</h2>
            <p>
              Questions about these terms?{" "}
              <a href="mailto:legal@kids-xtra.app" className="text-violet-600 hover:underline">legal@kids-xtra.app</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 flex gap-6 text-sm font-bold text-slate-500">
          <Link href="/privacy" className="hover:text-violet-600 transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-violet-600 transition-colors">Back to Home</Link>
        </div>
      </main>
    </div>
  )
}
